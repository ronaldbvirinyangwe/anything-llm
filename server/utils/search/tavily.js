/**
 * Tavily Search - Optimized for LLMs and RAG
 * Automatically searches and extracts clean content from results.
 */
module.exports = async function tavilySearch(query, numResults = 5) {
  try {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      console.error("❌ Missing TAVILY_API_KEY in .env file");
      throw new Error("Tavily API key is missing.");
    }

    console.log(`🕵️ Searching Tavily for: "${query}"`);

    // We use the 'search' endpoint because it finds AND extracts content
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",      // "advanced" is deeper but slower/more expensive
        topic: "general",           // Can be "news" if you want strictly news
        max_results: numResults,
        include_images: false,
        include_answer: true,       // Tavily generates a short answer itself
        include_raw_content: false, // We want the processed content, not raw HTML
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const results = data.results || [];

    // Map the results to your standard format
    const formattedResults = results.map((result) => ({
      title: result.title,
      url: result.url,
      // Tavily's 'content' is the extracted text you wanted
      snippet: result.content || result.snippet, 
      source: "Tavily"
    }));

    // If Tavily generated a direct answer, add it as the top "result"
    if (data.answer) {
      formattedResults.unshift({
        title: "Direct Answer (Tavily AI)",
        url: "https://tavily.com",
        snippet: data.answer,
        source: "Tavily Instant Answer"
      });
    }

    return formattedResults;

  } catch (error) {
    console.error("❌ Tavily search failed:", error.message);
    // Return empty array to prevent chat crash
    return [];
  }
};