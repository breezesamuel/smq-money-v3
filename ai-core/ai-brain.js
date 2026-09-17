const { modelRouter } = require('./model-router');

class AIBrain {
  constructor() {
    this.memory = [];
    this.context = [];
    this.maxContextLength = 10;
    this.router = modelRouter;
  }

  setApiKey() {
    // 密钥统一由 .env / config.js 管理
  }

  async callAI(prompt, options = {}) {
    return await this.router.call(prompt, options);
  }

  async think(prompt, context = {}) {
    this.context.push({ role: 'user', content: prompt, timestamp: new Date().toISOString() });
    if (this.context.length > this.maxContextLength) {
      this.context = this.context.slice(-this.maxContextLength);
    }

    const systemPrompt = `You are the central AI brain of an AI company operating under an AI executive team (CEO/CFO/COO/CTO/CMO/Sales/Risk/Customer Success).
You have capabilities across strategy, finance, marketing, sales, operations, product, risk.
Current context: ${JSON.stringify(context)}
Respond with depth, wisdom, and actionable insights with concrete numbers.`;

    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;
    const response = await this.router.call(fullPrompt, { system: systemPrompt });

    if (response.content) {
      this.context.push({
        role: 'assistant',
        content: response.content,
        model: response.model,
        timestamp: new Date().toISOString()
      });
    }
    return response;
  }

  async analyze(text, type = 'general') {
    const prompts = {
      general: `Analyze this text and provide insights: ${text}`,
      sentiment: `Analyze the sentiment of this text: ${text}`,
      keywords: `Extract key topics and entities from: ${text}`,
      summary: `Provide a concise summary: ${text}`
    };
    const prompt = prompts[type] || prompts.general;
    return await this.router.call(prompt);
  }

  async generate(prompt, options = {}) {
    return await this.router.call(prompt, options);
  }

  listModels() {
    return this.router.listModels();
  }

  getModelStats() {
    return this.router.getStats();
  }

  getMemory() {
    return this.context;
  }

  clearMemory() {
    this.context = [];
  }
}

const aiBrain = new AIBrain();

module.exports = { AIBrain, aiBrain };