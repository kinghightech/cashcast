async function testApi() {
  const NEWS_API_KEY = '1bf5671e-6429-4731-9cbc-90d5107315de';
  try {
    const res = await fetch('https://eventregistry.org/api/v1/article/getArticles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getArticles',
        keyword: 'restaurant',
        categoryUri: 'news/Business',
        lang: 'eng',
        sourceLocationUri: 'http://en.wikipedia.org/wiki/United_States',
        articlesPage: 1,
        articlesCount: 4,
        articlesSortBy: 'date',
        articlesSortByAsc: false,
        dataType: ['news'],
        apiKey: NEWS_API_KEY,
      }),
    });
    const data = await res.json();
    console.log(data.articles?.results?.map(r => r.title));
  } catch (err) {
    console.error("error", err);
  }
}
testApi();
