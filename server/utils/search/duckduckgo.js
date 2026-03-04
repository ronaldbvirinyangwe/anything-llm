// /**
//  * specific search using DuckDuckGo Instant Answer API.
//  * Note: This API is best for definitions and facts, not deep web scraping.
//  */
// async function duckduckgoSearch(query, numResults = 10) {
//   try {
//     console.log(`🦆 Searching DuckDuckGo (Instant Answer) for: ${query}`);
    
//     // The format=json&no_redirect=1 ensures we get JSON back even for "bang" searches
//     const response = await fetch(
//       `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&t=chikoroAI`
//     );
    
//     if (!response.ok) {
//         throw new Error(`DuckDuckGo API responded with status: ${response.status}`);
//     }

//     const data = await response.json();
//     let results = [];

//     // 1. Check for a direct "Abstract" answer (e.g. "What is a python?")
//     if (data.Abstract && data.AbstractURL) {
//       results.push({
//         title: data.Heading || query,
//         url: data.AbstractURL,
//         snippet: data.Abstract,
//         source: "DuckDuckGo Instant Answer"
//       });
//     }

//     // 2. Process "RelatedTopics" (the main list of results)
//     if (data.RelatedTopics && data.RelatedTopics.length > 0) {
//       const topics = data.RelatedTopics
//         .filter(topic => topic.Text && topic.FirstURL) // Filter out empty or category-only topics
//         .slice(0, numResults)
//         .map(topic => ({
//           title: topic.Text.split(' - ')[0] || topic.Text,
//           url: topic.FirstURL,
//           snippet: topic.Text,
//           source: "DuckDuckGo"
//         }));
      
//       results = [...results, ...topics];
//     }

//     // 3. Fallback: If no results found, return a manual link to the search page
//     // This ensures the user at least gets a valid link to click if the API fails to scrape data.
//     if (results.length === 0) {
//         console.warn("⚠️ No Instant Answer results found. Providing fallback link.");
//         return [{
//             title: `Search results for "${query}"`,
//             url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
//             snippet: "No direct summary available. Click to view full search results on DuckDuckGo.",
//             source: "DuckDuckGo Fallback"
//         }];
//     }

//     // Limit to requested number
//     return results.slice(0, numResults);

//   } catch (error) {
//     console.error("❌ DuckDuckGo search error:", error.message);
//     // Return empty array so the agent doesn't crash
//     return [];
//   }
// }

// module.exports = duckduckgoSearch;