const axios = require('axios');

const RATE_CACHE = {
  usdToCny: 7.5,
  lastUpdate: null
};

const API_CONFIG = {
  frankfurter: 'https://api.frankfurter.app',
  currencyApi: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies'
};

async function getRateFromFrankfurter() {
  try {
    const res = await axios.get(`${API_CONFIG.frankfurter}/latest?from=USD&to=CNY`);
    return res.data.rates.CNY;
  } catch(e) {
    console.log('Frankfurter error:', e.message);
    return null;
  }
}

async function getRateFromCurrencyApi() {
  try {
    const res = await axios.get(`${API_CONFIG.currencyApi}/usd.json`);
    return res.data.usd.cny;
  } catch(e) {
    console.log('Currency-api error:', e.message);
    return null;
  }
}

async function getExchangeRate() {
  const now = Date.now();
  
  if (RATE_CACHE.lastUpdate && (now - RATE_CACHE.lastUpdate) < 60000) {
    return RATE_CACHE.usdToCny;
  }
  
  let rate = await getRateFromFrankfurter();
  
  if (!rate) {
    rate = await getRateFromCurrencyApi();
  }
  
  if (rate) {
    RATE_CACHE.usdToCny = rate;
    RATE_CACHE.lastUpdate = now;
    console.log(`[Exchange API] USD/CNY: ${rate}`);
  }
  
  return RATE_CACHE.usdToCny;
}

const API_DOCS = {
  frankfurter: {
    url: 'https://www.frankfurter.app',
    description: 'Free currency exchange rates API',
    endpoints: [
      '/latest - Latest rates',
      '/historical - Historical rates',
      '/currencies - List currencies',
      '/time-series - Time series data'
    ]
  },
  currencyApi: {
    url: 'https://github.com/fawazahmed0/currency-api',
    description: 'Free currency API with 150+ currencies',
    noKey: true
  }
};

module.exports = {
  getExchangeRate,
  API_DOCS,
  RATE_CACHE
};