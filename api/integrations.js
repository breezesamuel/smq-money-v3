const https = require('https');
const http = require('http');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

const CurrencyExchanges = [
  { name: 'Frankfurter', url: 'https://api.frankfurter.app/latest?from=USD&to=CNY' },
  { name: 'ExchangeRate', url: 'https://open.erapi.com/v6/latest/USD' }
];

const Weather = [
  { name: 'Open-Meteo', url: 'https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74&current_weather=true&temperature_unit=fahrenheit' }
];

const Crypto = [
  { name: 'CryptoCompare', url: 'https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL,DOGE&tsyms=USD' }
];

const OtherAPIs = {
  jokes: 'https://v2.jokeapi.dev/joke/Any?type=single',
  cats: 'https://catfact.ninja/fact',
  dogs: 'https://dog.ceo/api/breeds/image/random'
};

async function getCurrencyRate() {
  for (const api of CurrencyExchanges) {
    try {
      const data = await fetch(api.url);
      const json = JSON.parse(data);
      
      if (json.rates) {
        return {
          source: api.name,
          usdToCny: json.rates.CNY,
          rates: json.rates,
          timestamp: new Date().toISOString()
        };
      }
    } catch(e) {
      console.log(api.name + ' error:', e.message);
    }
  }
  return { source: 'fallback', usdToCny: 7.5 };
}

async function getWeather() {
  try {
    const data = await fetch(Weather[0].url);
    return JSON.parse(data);
  } catch(e) {
    return { error: e.message };
  }
}

async function getCrypto() {
  try {
    const data = await fetch(Crypto[0].url);
    return JSON.parse(data);
  } catch(e) {
    return { error: e.message };
  }
}

async function getJoke() {
  try {
    const data = await fetch(OtherAPIs.jokes);
    return JSON.parse(data);
  } catch(e) {
    return { error: e.message };
  }
}

const PUBLIC_APIS = {
  currency: {
    name: 'Frankfurter',
    url: 'https://www.frankfurter.app',
    free: true,
    description: 'Free currency exchange rates'
  },
  weather: {
    name: 'Open-Meteo', 
    url: 'https://open-meteo.com',
    free: true,
    description: 'Free weather data'
  },
  crypto: {
    name: 'CryptoCompare',
    url: 'https://www.cryptocompare.com',
    free: true,
    description: 'Cryptocurrency prices'
  },
  jokeAPI: {
    name: 'JokeAPI',
    url: 'https://v2.jokeapi.dev',
    free: true,
    description: 'Random jokes'
  }
};

module.exports = {
  getCurrencyRate,
  getWeather,
  getCrypto,
  getJoke,
  PUBLIC_APIS
};