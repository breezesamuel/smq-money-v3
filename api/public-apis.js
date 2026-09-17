const axios = require('axios');

const PUBLIC_APIS = {
  coins: {
    url: 'https://api.coingecko.com/api/v3',
    free: true,
    description: 'Cryptocurrency prices'
  },
  weather: {
    url: 'https://api.open-meteo.com/v1',
    free: true,
    description: 'Weather data'
  },
  news: {
    url: 'https://saurav.tech/NewsAPI',
    free: true,
    description: 'World news'
  },
  stocks: {
    url: 'https://query1.finance.yahoo.com/v8',
    free: true,
    description: 'Stock quotes'
  }
};

async function getCryptoPrices() {
  try {
    const res = await axios.get(`${PUBLIC_APIS.coins.url}/simple/price?ids=bitcoin,ethereum,solana,dogecoin&vs_currencies=usd`);
    return res.data;
  } catch(e) {
    return { error: e.message };
  }
}

async function getWeather(city = 'New York') {
  const cityCoords = {
    'New York': { lat: 40.71, lon: -74.01 },
    'Beijing': { lat: 39.90, lon: 116.41 },
    'Shanghai': { lat: 31.23, lon: 121.47 },
    'Hong Kong': { lat: 22.32, lon: 114.17 }
  };
  
  const coords = cityCoords[city] || cityCoords['New York'];
  
  try {
    const res = await axios.get(`${PUBLIC_APIS.weather.url}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`);
    return res.data;
  } catch(e) {
    return { error: e.message };
  }
}

async function getNews() {
  try {
    const res = await axios.get(`${PUBLIC_APIS.news.url}/top-headlines/category/business/us.json`);
    return res.data;
  } catch(e) {
    return { error: e.message };
  }
}

module.exports = {
  PUBLIC_APIS,
  getCryptoPrices,
  getWeather,
  getNews
};