async function testApi() {
  try {
    const targetUrl = 'https://www.reddit.com/r/restaurantowners/hot.json?limit=6';
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
    const dataWrapper = await res.json();
    const data = JSON.parse(dataWrapper.contents);
    
    console.log(data.data.children.length);
  } catch (err) {
    console.error("error", err);
  }
}
testApi();
