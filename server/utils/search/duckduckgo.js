async function duckduckgoSearch(query, numResults = 10) {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`
    );
    const data = await response.json();
    
    const results = (data.RelatedTopics || [])
      .filter(topic => topic.Text && topic.FirstURL)
      .slice(0, numResults)
      .map(topic => ({
        title: topic.Text.split(' - ')[0],
        url: topic.FirstURL,
        snippet: topic.Text
      }));
    
    return results;
  } catch (error) {
    console.error("DuckDuckGo search error:", error);
    return [];
  }
}

module.exports = duckduckgoSearch;