const axios = require('axios');
const { buildConfig, activeModels } = require('./config');

class ModelRouter {
  constructor() {
    this.stats = {
      calls: 0,
      failures: 0,
      byModel: {},
      lastUsed: null
    };
  }

  listModels() {
    return activeModels();
  }

  setStatus(modelId, ok, ms, contentLen) {
    this.stats.calls++;
    if (!ok) this.stats.failures++;
    const rec = this.stats.byModel[modelId] || (this.stats.byModel[modelId] = { calls: 0, failures: 0, lastMs: 0 });
    rec.calls++;
    if (!ok) rec.failures++;
    rec.lastMs = ms;
    if (contentLen != null) rec.lastContentLen = contentLen;
    this.stats.lastUsed = modelId;
  }

  async call(prompt, opts = {}) {
    const preferred = opts.model || opts.preferred || null;
    const configs = buildConfig();
    const order = [];
    if (preferred && configs[preferred]) order.push(preferred);
    for (const id of Object.keys(configs)) {
      if (!configs[id].active) continue;
      if (!order.includes(id)) order.push(id);
    }
    // 默认优先级：智谱主 -> deepseek -> kimi -> siliconflow -> 其余
    order.sort((a, b) => {
      const rank = { zhipu1: 0, deepseek: 1, kimi: 2, siliconflow: 3, agnes: 4, minimax: 5, zhipu2: 6, volcengine: 7, nvidia: 8 };
      const ra = rank[a] ?? 50, rb = rank[b] ?? 50;
      if (preferred) {
        if (a === preferred) return -1;
        if (b === preferred) return 1;
      }
      return ra - rb;
    });

    const lastError = [];
    for (const id of order) {
      const cfg = configs[id];
      if (!cfg.active) continue;
      try {
        const t0 = Date.now();
        const content = await this._dispatch(id, cfg, prompt, opts);
        this.setStatus(id, true, Date.now() - t0, content.length);
        return { content, model: id, provider: cfg.name, usage: this.stats };
      } catch (e) {
        lastError.push({ model: id, error: e.message });
        this.setStatus(id, false, Date.now());
      }
    }
    return { error: 'ALL_MODELS_FAILED', details: lastError };
  }

  async _dispatch(modelId, cfg, prompt, opts) {
    const messages = [
      { role: 'system', content: opts.system || 'You are a sharp, concise AI executive assistant. Reply in the language of the user message unless told otherwise.' },
      { role: 'user', content: prompt }
    ];
    const payload = {
      model: cfg.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens || 2000
    };

    if (cfg.kind === 'minimax') {
      // MiniMax v2 endpoint 需要 GroupId 参数位置特殊
      const headers = { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' };
      const res = await axios.post(cfg.endpoint, {
        model: cfg.model,
        messages,
        temperature: payload.temperature,
        max_tokens: payload.max_tokens
      }, { headers, timeout: opts.timeout || 60000 });
      const text = res.data?.choices?.[0]?.message?.content || res.data?.reply || '';
      if (!text) throw new Error('empty minimax response');
      return text;
    }

    const res = await axios.post(cfg.endpoint, payload, {
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      timeout: opts.timeout || 60000
    });
    const text = res.data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('empty response');
    return text;
  }

  getStats() {
    return this.stats;
  }
}

const modelRouter = new ModelRouter();
module.exports = { ModelRouter, modelRouter };