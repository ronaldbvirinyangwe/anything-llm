const { getLLMProvider } = require("../utils/helpers/index");

/**
 * Smart chunking that preserves question boundaries
 */
function smartChunk(content, maxChunkSize = 10000) {
  if (content.length <= maxChunkSize) {
    return [content];
  }

  const chunks = [];
  let currentChunk = '';
  const sections = content.split(/\n\n+/);
  
  for (const section of sections) {
    if (currentChunk.length + section.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    
    if (section.length > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      let remaining = section;
      while (remaining.length > maxChunkSize) {
        chunks.push(remaining.substring(0, maxChunkSize).trim());
        remaining = remaining.substring(maxChunkSize);
      }
      if (remaining.length > 0) {
        currentChunk = remaining;
      }
    } else {
      currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + section;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Extract questions from content in parallel chunks
 */
async function extractQuestionsInChunks(content, type = 'exam') {
  const MAX_CHUNK_SIZE = 10000;
  const chunks = smartChunk(content, MAX_CHUNK_SIZE);
  
  console.log(`Processing ${type} in ${chunks.length} chunk(s)...`);
  
  const LLMConnector = getLLMProvider({
    provider: process.env.LLM_PROVIDER,
    model: process.env.LLM_MODEL,
  });
  
  const chunkPromises = chunks.map(async (chunk, i) => {
    console.log(`Processing ${type} chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);
    
    const chunkPrompt = `You are an expert at extracting exam questions from documents.

${type === 'mark_scheme' ? 'This is a MARK SCHEME. Extract questions AND marking criteria.' : 'This is an EXAM PAPER. Extract questions.'}

CONTENT (Part ${i + 1} of ${chunks.length}):
${chunk}

Extract all questions. Format each question EXACTLY like this:

MULTIPLE CHOICE:
1. [Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Letter]

STRUCTURED QUESTION:
2. [Question text]
Mark Scheme:
- [Point 1] (X marks)
- [Point 2] (Y marks)

IMPORTANT: Preserve the EXACT question numbers from the document. Do NOT renumber.

Extract now:`;

    try {
      const chunkResponse = await LLMConnector.getChatCompletion(
        [{ role: "user", content: chunkPrompt }],
        { 
          temperature: 0.3,
          max_tokens: 4000
        }
      );
      
      if (chunkResponse?.textResponse) {
        console.log(`✅ Chunk ${i + 1}/${chunks.length} processed`);
        return chunkResponse.textResponse;
      } else {
        console.error(`❌ Chunk ${i + 1}/${chunks.length} no response`);
        return '';
      }
    } catch (chunkError) {
      console.error(`Error processing chunk ${i + 1}:`, chunkError.message);
      return '';
    }
  });

  const results = await Promise.all(chunkPromises);
  return results.filter(r => r.length > 0).join('\n\n');
}

/**
 * Merge exam questions with mark scheme
 */
async function mergeQuestionsWithMarkScheme(examQuestions, markSchemeQuestions) {
  if (!markSchemeQuestions) {
    return examQuestions;
  }

  const LLMConnector = getLLMProvider({
    provider: process.env.LLM_PROVIDER,
    model: process.env.LLM_MODEL,
  });

  const maxMergeLength = 15000;
  const truncatedExam = examQuestions.length > maxMergeLength 
    ? examQuestions.substring(0, maxMergeLength) 
    : examQuestions;
  const truncatedScheme = markSchemeQuestions.length > maxMergeLength 
    ? markSchemeQuestions.substring(0, maxMergeLength) 
    : markSchemeQuestions;

  const mergePrompt = `Merge exam questions with mark schemes.

EXAM QUESTIONS:
${truncatedExam}

MARK SCHEME:
${truncatedScheme}

Format each question EXACTLY like this:

MULTIPLE CHOICE:
1. [Question]
A) [A]
B) [B]
C) [C]
D) [D]
Answer: [Letter]

STRUCTURED:
2. [Question]
Mark Scheme:
- [Point] ([marks])

IMPORTANT: Keep the EXACT question numbers. Do NOT renumber.

Merge now:`;

  try {
    const mergeResponse = await LLMConnector.getChatCompletion(
      [{ role: "user", content: mergePrompt }],
      { 
        temperature: 0.2,
        max_tokens: 4000
      }
    );
    
    return mergeResponse?.textResponse || examQuestions;
  } catch (mergeError) {
    console.error("Error merging:", mergeError.message);
    return examQuestions;
  }
}

/**
 * Parse extracted questions into structured format with metadata
 */
function parseQuestionsWithMetadata(extractedContent) {
  const questions = [];
  const lines = extractedContent.split('\n');
  
  let currentQuestion = null;
  let currentQuestionNumber = null;
  let inMarkScheme = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect question number (e.g., "1.", "Question 1:", "Q1.")
    const questionMatch = line.match(/^(?:Question\s+)?(\d+)[\.\):\s]/i);
    
    if (questionMatch) {
      // Save previous question
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      
      // Start new question
      currentQuestionNumber = parseInt(questionMatch[1]);
      currentQuestion = {
        questionNumber: currentQuestionNumber,
        text: line.replace(/^(?:Question\s+)?\d+[\.\):\s]/i, '').trim(),
        options: [],
        markScheme: [],
        answer: null,
        type: 'structured' // Will be updated if options found
      };
      inMarkScheme = false;
    } else if (currentQuestion) {
      // Check for multiple choice options
      const optionMatch = line.match(/^([A-D])\)\s*(.+)/i);
      if (optionMatch) {
        currentQuestion.type = 'multiple_choice';
        currentQuestion.options.push({
          letter: optionMatch[1].toUpperCase(),
          text: optionMatch[2].trim()
        });
      }
      
      // Check for answer
      const answerMatch = line.match(/^Answer:\s*([A-D])/i);
      if (answerMatch) {
        currentQuestion.answer = answerMatch[1].toUpperCase();
      }
      
      // Check for mark scheme section
      if (line.toLowerCase().includes('mark scheme')) {
        inMarkScheme = true;
      } else if (inMarkScheme && line.startsWith('-')) {
        currentQuestion.markScheme.push(line.substring(1).trim());
      } else if (!optionMatch && !answerMatch && line.length > 0) {
        // Add to question text if it's not an option or answer
        currentQuestion.text += ' ' + line;
      }
    }
  }
  
  // Save last question
  if (currentQuestion) {
    questions.push(currentQuestion);
  }
  
  return questions;
}

module.exports = {
  smartChunk,
  extractQuestionsInChunks,
  mergeQuestionsWithMarkScheme,
  parseQuestionsWithMetadata
};