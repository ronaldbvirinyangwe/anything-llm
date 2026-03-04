const { getLLMProvider, getVectorDbClass } = require("../utils/helpers");

/**
 * 🧠 INTELLIGENT DOCUMENT RETRIEVAL SYSTEM
 * 
 * Combines:
 * 1. Query Expansion - LLM generates alternative phrasings
 * 2. Metadata Filtering - Exact matches on structured data (question numbers, types)
 * 3. Semantic Search - Vector similarity for conceptual matches
 * 4. Smart Deduplication - Combines results without duplicates
 */

async function expandQuery(userQuery, LLMConnector) {
  try {
    if (userQuery.length < 10 || userQuery.match(/^(question|q\.?)\s*\d+/i)) {
      return [userQuery];
    }

    const expansionPrompt = `You are helping search for educational documents. Generate alternative search terms for this query.

User Query: "${userQuery}"

Generate 3-5 search variations that would help find relevant educational content:
- Synonyms and related concepts
- Different phrasings
- Key academic terms
- Broader/narrower topics

Return ONLY the search terms, one per line, without numbering or explanations.`;

    const response = await LLMConnector.getChatCompletion(
      [{ role: "user", content: expansionPrompt }],
      { temperature: 0.3, max_tokens: 150, stream: false }
    );
    
    if (!response?.textResponse) {
      console.log("⚠️ Query expansion failed, using original query");
      return [userQuery];
    }

    const expandedTerms = response.textResponse
      .split('\n')
      .map(term => term.trim())
      .filter(term => term.length > 3 && !term.match(/^\d+\./))
      .slice(0, 5);
    
    console.log(`🔍 Query expanded from "${userQuery}" to ${expandedTerms.length} variations`);
    return [userQuery, ...expandedTerms];

  } catch (error) {
    console.error("❌ Query expansion error:", error.message);
    return [userQuery];
  }
}

/**
 * Extract metadata filters from user query
 */
function extractMetadataFilters(userQuery) {
  const filters = {};
  const lowerQuery = userQuery.toLowerCase();
  
  const questionMatch = lowerQuery.match(
    /(?:question|q\.?|number|num\.?|no\.?|#)\s*(\d{1,2})(?!\d)/i
  );
  if (questionMatch) {
    filters.questionNumber = parseInt(questionMatch[1]);
    console.log(`🎯 Metadata filter: Question number ${filters.questionNumber}`);
  }

  if (lowerQuery.includes('multiple choice') || lowerQuery.includes('mcq')) {
    filters.type = 'multiple_choice';
    console.log(`🎯 Metadata filter: Type = multiple_choice`);
  } else if (lowerQuery.includes('structured') || lowerQuery.includes('essay')) {
    filters.type = 'structured';
    console.log(`🎯 Metadata filter: Type = structured`);
  }
  
  if (lowerQuery.includes('diagram') || lowerQuery.includes('graph') || lowerQuery.includes('image')) {
    filters.imageType = true;
    console.log(`🎯 Metadata filter: Image content`);
  }
  
  return Object.keys(filters).length > 0 ? filters : null;
}

/**
 * Perform metadata-filtered search.
 * 
 * FIX: Was querying metadata->>'title' with a regex pattern like " - Question 8$"
 * but the embed pipeline stores metadata->>'questionNumber' as an integer.
 * Now queries questionNumber directly with a cast, then falls back to
 * a content-based keyword search for documents embedded via the standard pipeline.
 */
async function metadataSearch(workspace, filters, topN = 3, LLMConnector = null) {
  try {
    const VectorDb = getVectorDbClass();

    if (filters.questionNumber) {
      const connection = await VectorDb.connect();
      try {
        // ✅ FIX: Query questionNumber as integer directly.
        // Previously queried title with regex — but /upload-exam-paper stores
        // questionNumber in metadata, not a formatted title string.
        const result = await connection.query(
          `SELECT metadata FROM "${VectorDb.tableName()}"
           WHERE namespace = $1
           AND (metadata->>'questionNumber')::int = $2
           LIMIT $3`,
          [workspace.slug, filters.questionNumber, topN]
        );

        if (result.rows.length > 0) {
          console.log(`✅ Metadata search found ${result.rows.length} exact match(es) for Question ${filters.questionNumber}`);
          return result.rows.map(r => ({
            content: r.metadata.text || r.metadata.pageContent || "",
            metadata: r.metadata,
            score: 1.0,
            source: 'metadata'
          }));
        }

        // ✅ FALLBACK: Document was uploaded via standard pipeline (no per-question metadata).
        // Search by content to find the chunk containing this question number.
        //
        // Cambridge exam papers format questions as bare numbers: "1 The diagram shows..."
        // NOT as "Question 1 ..." — so we match both formats:
        //   - "Question 8" (our own embedded format from upload-exam-paper)
        //   - "\n8 " or start-of-text "8 " (Cambridge bare number format)
        console.log(`⚠️ No metadata match for Q${filters.questionNumber}. Falling back to content search.`);
        const qNum = filters.questionNumber;
        // Use LIKE with an actual newline character (\n) in the parameter rather than
        // a POSIX regex escape. POSIX `\n` can be unreliable for single-digit questions
        // (e.g. Q5) where the regex engine may behave differently from Q10+.
        // Passing a real newline byte in the parameter is always correctly matched by LIKE.
        // Pattern: ...previous text...\n5 What is... → `%\n5 %` catches it at any position.
        const contentResult = await connection.query(
          `SELECT metadata FROM "${VectorDb.tableName()}"
           WHERE namespace = $1
           AND (
             metadata->>'text' ILIKE $2
             OR metadata->>'text' LIKE '%' || $3 || '%'
           )
           LIMIT $4`,
          [
            workspace.slug,
            `%Question ${qNum}%`,   // our embedded format: "Question 5 ..."
            `\n${qNum} `,           // Cambridge format: actual newline + number + space
            topN
          ]
        );

        if (contentResult.rows.length > 0) {
          console.log(`✅ Content fallback found ${contentResult.rows.length} result(s) for Question ${qNum}`);
          return contentResult.rows.map(r => ({
            content: r.metadata.text || r.metadata.pageContent || "",
            metadata: r.metadata,
            score: 0.9,
            source: 'metadata_content_fallback'
          }));
        }

      } finally {
        await connection.end();
      }
    }

    // Type / image filters — use semantic search
    let searchQuery = '';
    if (filters.type) searchQuery = `${filters.type} question`;
    else if (filters.imageType) searchQuery = 'diagram image graph';
    if (!searchQuery) return [];

    const results = await VectorDb.performSimilaritySearch({
      namespace: workspace.slug,
      input: searchQuery,
      similarityThreshold: 0.1,
      topN,
      LLMConnector,
    });

    if (results?.contextTexts?.length > 0) {
      return results.contextTexts.map((text, i) => ({
        content: text,
        metadata: results.sources?.[i] || {},
        score: 1.0,
        source: 'metadata'
      }));
    }

    return [];

  } catch (error) {
    console.error("❌ Metadata search error:", error.message);
    return [];
  }
}

/**
 * Perform semantic search with query expansion
 */
async function semanticSearch(workspace, queries, topN = 5, excludeIds = [], LLMConnector = null) {
  try {
    const VectorDb = getVectorDbClass();
    const allResults = [];
    
    for (const query of queries) {
      const results = await VectorDb.performSimilaritySearch({
        namespace: workspace.slug,
        input: query,
        similarityThreshold: 0.4,
        topN,
        LLMConnector,
      });
      
      if (results?.contextTexts?.length > 0) {
        allResults.push(...results.contextTexts.map((text, i) => ({
          content: text,
          metadata: results.sources?.[i] || {},
          score: results.sources?.[i]?.score || 0,
          source: 'semantic',
          query
        })));
      }
    }
    
    console.log(`🔍 Semantic search found ${allResults.length} results across ${queries.length} query variation(s)`);
    return allResults;
    
  } catch (error) {
    console.error("❌ Semantic search error:", error.message);
    return [];
  }
}

/**
 * Deduplicate results — keeps highest-scoring version of each unique chunk.
 *
 * Uses two-level deduplication:
 *   1. UUID-level: `metadata.id` is the per-chunk primary key from PGVector.
 *      This is the primary key and is always unique per insertion.
 *   2. Content-level: chunks with near-identical text (same document uploaded
 *      multiple times creating duplicate vectors) are collapsed using a content
 *      fingerprint that skips the shared <document_metadata> header (~120 chars).
 */
function deduplicateResults(results) {
  const seen = new Map();

  for (const result of results) {
    // Primary key: per-chunk UUID from the vector DB primary key column.
    // Secondary key: content fingerprint (chars 120–320) skips the shared
    // <document_metadata> header so duplicate uploads are also collapsed.
    const contentKey = result.content.substring(120, 320).trim();
    const key = result.metadata?.questionNumber
      ? `q_${result.metadata.questionNumber}`
      : contentKey || result.metadata?.id;

    if (!seen.has(key) || seen.get(key).score < result.score) {
      seen.set(key, result);
    }
  }

  return Array.from(seen.values());
}

/**
 * 🎯 MAIN INTELLIGENT RETRIEVAL FUNCTION
 */
async function intelligentRetrievalWithExpansion(userQuery, workspace, options = {}) {
  const {
    maxResults = 5,
    enableExpansion = true,
    enableMetadata = true,
    LLMConnector = null
  } = options;
  
  console.log(`\n🧠 Starting intelligent retrieval for: "${userQuery}"`);
  
  const allResults = [];
  
  try {
    let metadataResults = [];
    if (enableMetadata) {
      const filters = extractMetadataFilters(userQuery);
      
      if (filters) {
        metadataResults = await metadataSearch(workspace, filters, 3, LLMConnector);
        
        if (metadataResults.length > 0) {
          console.log(`✨ Found ${metadataResults.length} exact metadata match(es) — prioritising`);
          allResults.push(...metadataResults);
          
          if (filters.questionNumber && metadataResults.length > 0) {
            console.log(`🎯 Question-specific query resolved with metadata`);
            return metadataResults.slice(0, maxResults);
          }
        }
      }
    }
    
    // Strip the [Subject: ...] [Curriculum: ...] etc. prefix that the chat pipeline
    // prepends to every query. These metadata tags bias the embedding toward the
    // document's cover page (which also mentions "Cambridge Biology" etc.) and away
    // from the actual question content we need.
    const bareQuery = userQuery.replace(/^(\[[\w\s]+:[^\]]+\]\s*)+/, "").trim() || userQuery;
    console.log(`🔎 Semantic search query (stripped): "${bareQuery}"`);

    let expandedQueries = [bareQuery];
    if (enableExpansion && LLMConnector) {
      expandedQueries = await expandQuery(bareQuery, LLMConnector);
    }

    const semanticResults = await semanticSearch(
      workspace,
      expandedQueries,
      maxResults,
      metadataResults.map(r => r.metadata?.docId).filter(Boolean),
      LLMConnector
    );

    allResults.push(...semanticResults);

    const deduplicated = deduplicateResults(allResults);
    const ranked = deduplicated.sort((a, b) => b.score - a.score);
    const finalResults = ranked.slice(0, maxResults);

    console.log(`✅ Intelligent retrieval complete: ${finalResults.length} results`);
    console.log(`   - Metadata matches: ${metadataResults.length}`);
    console.log(`   - Semantic matches: ${semanticResults.length}`);
    console.log(`   - After deduplication: ${deduplicated.length}`);

    return finalResults;
    
  } catch (error) {
    console.error("❌ Intelligent retrieval failed:", error.message);
    try {
      const VectorDb = getVectorDbClass();
      const fallbackResults = await VectorDb.performSimilaritySearch({
        namespace: workspace.slug,
        input: userQuery,
        topN: maxResults
      });
      
      return fallbackResults.map(r => ({
        content: r.text || r.content,
        metadata: r.metadata || {},
        score: r.score || 0,
        source: 'fallback'
      }));
    } catch (fallbackError) {
      console.error("❌ Fallback search also failed:", fallbackError.message);
      return [];
    }
  }
}

async function hasDocuments(workspace) {
  try {
    const VectorDb = getVectorDbClass();
    const count = await VectorDb.namespaceCount(workspace.slug);
    return count > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Format retrieved documents into context string for LLM.
 * 
 * The system prompt injected here must be authoritative — use imperative language
 * so the LLM doesn't second-guess whether it has the question.
 */
function formatContextForLLM(results, userQuery) {
  if (!results || results.length === 0) return null;

  let context = `=== EXAM PAPER CONTENT — READ BEFORE RESPONDING ===
MANDATORY INSTRUCTIONS:
- The student has already uploaded their exam paper. The exact question text is extracted below.
- You ALREADY HAVE the question content. Do NOT ask the student to paste or retype it.
- Do NOT say you "cannot see" the question or that it was "not provided".
- Use the content below to give a complete, step-by-step explanation referencing options A, B, C, D directly where present.
- Respond in the same language the student is using.

`;

  results.forEach((result, i) => {
    if (result.content?.trim()) {
      context += `--- Question Content (chunk ${i + 1}) ---\n${result.content.trim()}\n\n`;
    }
  });

  context += `=== END OF EXAM CONTENT ===\n\nNow answer the student's question using the content above.`;
  return context;
}

module.exports = {
  intelligentRetrievalWithExpansion,
  expandQuery,
  extractMetadataFilters,
  metadataSearch,
  semanticSearch,
  deduplicateResults,
  hasDocuments,
  formatContextForLLM
};