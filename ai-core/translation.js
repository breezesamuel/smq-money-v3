const axios = require('axios');

class TranslationService {
  constructor() {
    this.languages = {
      zh: { name: '中文', native: 'Chinese' },
      en: { name: 'English', native: 'English' },
      ja: { name: '日本語', native: 'Japanese' },
      ko: { name: '한국어', native: 'Korean' },
      es: { name: 'Español', native: 'Spanish' },
      fr: { name: 'Français', native: 'French' },
      de: { name: 'Deutsch', native: 'German' },
      pt: { name: 'Português', native: 'Portuguese' },
      ru: { name: 'Русский', native: 'Russian' },
      ar: { name: 'العربية', native: 'Arabic' },
      hi: { name: 'हिन्दी', native: 'Hindi' },
      it: { name: 'Italiano', native: 'Italian' }
    };
    
    this.cache = new Map();
  }

  async translate(text, from = 'auto', to = 'en') {
    const cacheKey = `${text}_${from}_${to}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await axios.get('https://api.mymemory.translated.net/get', {
        params: {
          q: text,
          langpair: `${from}|${to}`
        },
        timeout: 5000
      });

      if (response.data.responseStatus === 200) {
        const result = response.data.responseData.translatedText;
        this.cache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.log('Translation error:', error.message);
      return text;
    }
  }

  async translateBatch(texts, from = 'auto', to = 'en') {
    const results = [];
    for (const text of texts) {
      results.push(await this.translate(text, from, to));
    }
    return results;
  }

  async detectLanguage(text) {
    try {
      const response = await axios.get('https://api.mymemory.translated.net/get', {
        params: {
          q: text.substring(0, 100)
        }
      });
      return response.data.matches[0]?.source || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  getLanguages() {
    return this.languages;
  }

  clearCache() {
    this.cache.clear();
  }
}

const translator = new TranslationService();

module.exports = { TranslationService, translator };