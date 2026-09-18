const express = require('express');
const cors = require('cors');
const path = require('path');
const { AIEmployeeManager, AICEO, AICFO } = require('./ai-core/employees');
const { CommandCenter, CustomerServiceConsole, DecisionConsole } = require('./ai-core/command-center');
const { AIBrain, aiBrain } = require('./ai-core/ai-brain');
const { orgManager, orgEmployees, weeklyBoardMeeting, dailyBoardMeeting, PROFILES } = require('./ai-core/ai-org');
const { modelRouter } = require('./ai-core/model-router');
const { activeModels, WALLETS, ADMIN } = require('./ai-core/config');
const { TranslationService, translator } = require('./ai-core/translation');
const { MultiLanguageUI, multiLang } = require('./ai-core/multilang');
const { FinancialSystem, ProcurementSystem, SalesManager, financialSystem, procurementSystem, salesManager } = require('./ai-core/finance');
const { SecuritySystem, EvolutionSystem, securitySystem, evolutionSystem } = require('./ai-core/security');

const app = express();
const PORT = process.env.PORT || 3003;

// AI 每日调用上限防护（环境变量 AI_DAILY_CALL_LIMIT 默认 5000）
// key 格式: IP@YYYY-MM-DD；跨实例不可共享（Serverless 实例独立计数）
const dailyCallLimit = process.env.AI_DAILY_CALL_LIMIT || 5000;
const dailyCalls = new Map();

function checkAiDailyLimit(ip) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}@${today}`;
  const cnt = dailyCalls.get(key) || 0;
  if (cnt >= dailyCallLimit) {
    return false; // 超限
  }
  dailyCalls.set(key, cnt + 1);
  return true;
}

// 按 IP 计费的中间件，挂在 /api/ai 前
app.use('/api/ai', (req, res, next) => {
  const ip = req.ip || 'unknown';
  if (!checkAiDailyLimit(ip)) {
    return res.status(429).json({ error: '每日 AI 调用上限' });
  }
  next();
});

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'ai-admin', 'index.html'));
});

app.get('/admin/promo', (req, res) => {
  res.sendFile(path.join(__dirname, 'ai-admin', 'promo.html'));
});

const aiManager = new AIEmployeeManager();
const commandCenter = new CommandCenter(aiManager);
const customerService = new CustomerServiceConsole();
const decisionConsole = new DecisionConsole();

app.get('/api/ai/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    components: {
      aiManager: 'online',
      commandCenter: commandCenter.monitoring ? 'monitoring' : 'stopped',
      aiBrain: 'online',
      security: 'online'
    }
  });
});

app.get('/api/ai/employees', (req, res) => {
  res.json({
    employees: aiManager.getAllEmployees(),
    total: aiManager.employees.size,
    departments: Object.keys(aiManager.departments).map(d => ({
      name: d,
      count: aiManager.departments[d].length
    }))
  });
});

app.get('/api/ai/command-center', (req, res) => {
  res.json(commandCenter.getDashboard());
});

app.post('/api/ai/command', (req, res) => {
  const { command, target, priority } = req.body;
  const cmd = commandCenter.sendCommand({
    command,
    target,
    priority: priority || 5
  });
  res.json({ success: true, command: cmd });
});

app.get('/api/ai/alerts', (req, res) => {
  res.json({
    alerts: commandCenter.alerts,
    unread: commandCenter.alerts.filter(a => !a.read).length
  });
});

app.get('/api/ai/decision-console', (req, res) => {
  res.json({
    pending: decisionConsole.getPendingDecisions(),
    history: decisionConsole.history
  });
});

app.post('/api/ai/decision', (req, res) => {
  const { decision, priority } = req.body;
  const result = decisionConsole.requestDecision(decision, priority || 50);
  res.json({ success: true, decision: result });
});

app.post('/api/ai/decision/:id/approve', (req, res) => {
  const { approved, notes } = req.body;
  const result = decisionConsole.approveDecision(req.params.id, approved, notes);
  res.json({ success: true, result });
});

app.post('/api/ai/brain/think', (req, res) => {
  const { prompt, context } = req.body;
  aiBrain.think(prompt, context).then(result => {
    res.json({ success: true, result });
  }).catch(error => {
    res.json({ success: false, error: error.message });
  });
});

// POST /api/ai/tool/run - 512 小工具真实执行（按工具痛点构造 system prompt）
const AI_FREE_TOOL_CALLS = process.env.AI_FREE_TOOL_CALLS || 10; // 直连接口免费调用闸（与前端 quota 双轨，防绕过）
const toolCalls = new Map();
function checkToolFreeCalls(ip, toolId) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}@${toolId}@${today}`;
  const cnt = toolCalls.get(key) || 0;
  if (cnt >= AI_FREE_TOOL_CALLS) return false;
  toolCalls.set(key, cnt + 1);
  return true;
}
app.post('/api/ai/tool/run', async (req, res) => {
  const { tool, input, lang, toolId } = req.body || {};
  if (!tool || !tool.slug) return res.status(400).json({ error: '需要 tool' });
  const ip = req.ip || 'unknown';
  if (!checkToolFreeCalls(ip, toolId || tool.slug)) {
    return res.status(402).json({ error: '已用完本工具免费次数，请升级订阅', code: 'limit_reached' });
  }
  const meta = (tool.name && (tool.name[lang] || tool.name.zh || tool.name.en)) || {};
  const fallbackMeta = (tool.name && tool.name.zh) || {};
  const title = meta.title || fallbackMeta.title || tool.slug;
  const pain = meta.pain || fallbackMeta.pain || '';
  const desc = meta.desc || fallbackMeta.desc || '';
  const langHint = lang === 'en' ? 'English' : lang === 'ar' ? 'العربية' : '简体中文';
  const system = `你是一个名为「${title}」的实用 AI 工具。\n核心价值：${pain}\n职责：${desc}\n要求：用${langHint}直接输出高质量、具体、可直接落地的结果。禁止寒暄客套。若用户输入不足，主动给出一组典型示例或询问关键信息后给出最佳答案。`;
  const prompt = input && String(input).trim()
    ? `用户请求：${String(input).trim().slice(0, 4000)}\n请用「${title}」的能力处理并给出结果。`
    : `请用「${title}」的典型能力演示一次完整输出（含示例）。`;
  try {
    const r = await modelRouter.call(prompt, { system, temperature: 0.7, maxTokens: 1500 });
    if (r.error) return res.status(502).json({ error: r.error, details: r.details });
    res.json({ success: true, result: r.content, model: r.model });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post('/api/ai/brain/analyze', (req, res) => {
  const { text, type } = req.body;
  aiBrain.analyze(text, type || 'general').then(result => {
    res.json({ success: true, result });
  }).catch(error => {
    res.json({ success: false, error: error.message });
  });
});

app.get('/api/ai/finance', (req, res) => {
  res.json(financialSystem.getFinancialReport());
});

app.post('/api/ai/finance/revenue', (req, res) => {
  const { amount, source } = req.body;
  financialSystem.addRevenue(amount, source);
  res.json({ success: true, revenue: financialSystem.accounts.revenue });
});

app.post('/api/ai/finance/expense', (req, res) => {
  const { amount, category, description } = req.body;
  financialSystem.addExpense(amount, category, description);
  res.json({ success: true, profit: financialSystem.accounts.profit });
});

app.get('/api/ai/finance/optimize', (req, res) => {
  res.json({
    recommendations: financialSystem.optimizeProfitMargin(),
    tax: financialSystem.analyzeTax(),
    distribution: financialSystem.calculateDistribution(financialSystem.accounts.profit)
  });
});

app.get('/api/ai/sales', (req, res) => {
  res.json(salesManager.getPerformance());
});

app.post('/api/ai/sales/order', (req, res) => {
  const { amount, customerId, products } = req.body;
  const order = salesManager.addOrder({ amount, customerId, products });
  res.json({ success: true, order });
});

app.get('/api/ai/procurement', (req, res) => {
  res.json({
    products: procurementSystem.products,
    suppliers: procurementSystem.suppliers,
    pendingOrders: procurementSystem.orders
  });
});

app.post('/api/ai/procurement/product', (req, res) => {
  const product = req.body;
  procurementSystem.addProduct(product);
  res.json({ success: true, product });
});

app.post('/api/ai/procurement/reorder/:productId', (req, res) => {
  const result = procurementSystem.reorder(req.params.productId);
  res.json(result);
});

app.get('/api/ai/translation/languages', (req, res) => {
  res.json(translator.getLanguages());
});

app.post('/api/ai/translation/translate', (req, res) => {
  const { text, from, to } = req.body;
  translator.translate(text, from || 'auto', to || 'en').then(result => {
    res.json({ success: true, translation: result });
  });
});

app.get('/api/ai/security', (req, res) => {
  res.json({
    firewall: {
      enabled: securitySystem.firewall.enabled,
      rules: securitySystem.firewall.rules.length,
      blockedIPs: Array.from(securitySystem.firewall.blockedIPs)
    },
    auditLog: securitySystem.getAuditLog(20)
  });
});

app.get('/api/ai/evolution', (req, res) => {
  res.json(evolutionSystem.getStats());
});

app.post('/api/ai/evolution/improve', (req, res) => {
  const { area, description, impact } = req.body;
  evolutionSystem.recordImprovement(area, description, impact);
  res.json({ success: true });
});

app.get('/api/ai/customer-service/tickets', (req, res) => {
  res.json(customerService.getTickets());
});

app.post('/api/ai/customer-service/ticket', (req, res) => {
  const ticket = customerService.createTicket(req.body);
  res.json({ success: true, ticket });
});

app.post('/api/ai/customer-service/ticket/:id/resolve', (req, res) => {
  const { resolution } = req.body;
  const ticket = customerService.resolveTicket(req.params.id, resolution);
  res.json({ success: true, ticket });
});

app.post('/api/ai/org/board-meeting', async (req, res) => {
  try {
    const result = await weeklyBoardMeeting(req.body || {});
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 每日主管例会调度器（在 Serverless 实例启动时启动，每天固定时间自动触发）
const dailyBoardInterval = setInterval(() => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const lastRun = global._lastDailyBoard;
  if (lastRun !== todayStr) {
    global._lastDailyBoard = todayStr;
    dailyBoardMeeting({ instructions: 'review today\'s work, set today\'s priorities, allocate today\'s budget.' })
      .then(result => {
        console.log(`[Daily Board] ${todayStr}: CEO executed daily meeting, result: ${result ? 'success' : 'error'}`);
      }).catch(err => {
        console.error(`[Daily Board] ${todayStr} error:`, err.message);
      });
  }
}, 86400000); // 24小时

// 手动触发每日板会（可被定时任务或运维调用）
app.post('/api/ai/daily-board', async (req, res) => {
  try {
    const result = await dailyBoardMeeting(req.body || {});
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ===== Okara Influencer Agent + 推广自动化 =====
const promoter = require('./promo/promoter');
const okara = require('./promo/okara');

// 单次生成一篇推广帖（手动/实时）
app.post('/api/okara/generate', async (req, res) => {
  try {
    const { material, lang, platform, persona } = req.body || {};
    const pick = require('./promo/promoter').mixMaterials;
    const mats = material ? [{ slug: material, title: material, pain: '', category: 'custom' }] : pick(1, 1);
    const post = await okara.generatePost(mats[0], { lang: lang || 'zh', platform: platform || 'twitter', persona: persona || 'game_boy' });
    const { track } = require('./report/analytics');
    track('promoGenerated', { detail: { providers: { [post.model]: 1 } } });
    res.json({ success: !post.error, post });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 批量生成一轮 campaign（默认低成本 6 素材×3 语言×2 平台）
app.post('/api/promo/campaign', async (req, res) => {
  try {
    const opts = req.body || {};
    const campaign = await promoter.generateCampaign(opts);
    const { track } = require('./report/analytics');
    track('promoGenerated', { amount: campaign.posts.length, detail: { providers: (campaign.posts || []).reduce((a, p) => { if (p.model) a[p.model] = (a[p.model] || 0) + 1; return a; }, {}) } });
    res.json({ success: true, campaignId: campaign.campaignId, counts: campaign.counts, total: campaign.posts.length });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 构建当日分发清单
app.get('/api/promo/plan', (req, res) => {
  const dateStr = new Date().toISOString().slice(0, 10);
  const plan = promoter.buildDispatchPlan(dateStr, Number(req.query.max || 3));
  res.json({ success: true, date: dateStr, plan });
});

// 立即执行分发（webhook 或本地落库）
app.post('/api/promo/dispatch', async (req, res) => {
  try {
    const result = await promoter.runDispatcher();
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 手动标记已发布
app.post('/api/promo/published', (req, res) => {
  const { postIds } = req.body || {};
  if (!postIds) return res.status(400).json({ error: 'postIds required' });
  res.json(promoter.markPublished(postIds));
});

// 追踪点击 (?ref=POSTID)
app.get('/api/promo/track', (req, res) => {
  const postId = req.query.ref;
  if (!postId) return res.status(400).json({ error: 'ref required' });
  res.json(promoter.trackClick(postId));
});

// 推广状态面板
app.get('/api/promo/status', (req, res) => {
  const feed = require('./promo/store').get('feed') || [];
  const published = require('./promo/store').get('published') || [];
  const dispatchPlan = require('./promo/store').get('dispatchPlan') || [];
  const stats = require('./promo/store').get('stats') || {};
  res.json({
    success: true,
    stats,
    campaigns: feed.length,
    postsInFeed: feed.reduce((a, c) => a + (c.posts ? c.posts.length : 0), 0),
    published: published.length,
    pendingDispatch: dispatchPlan.filter(p => !published.some(q => q.postId === p.postId)).length
  });
});

// ===== 多模型路由 =====
app.get('/api/ai/models', (req, res) => {
  res.json({
    active: activeModels().map(m => ({ id: m.id, name: m.name, model: m.model })),
    stats: modelRouter.getStats()
  });
});

app.get('/api/ai/health', (req, res) => {
  res.json({
    status: 'healthy',
    models: activeModels().map(m => m.id),
    org: Object.keys(orgEmployees),
    admin: ADMIN.email || null,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      ai_system: 'operational',
      financial_system: 'operational',
      security_system: 'operational'
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║    AI 智能员工基础架构 — 全AI 自运营公司          ║
║              服务器已启动                             ║
╠══════════════════════════════════════════════════════════╣
║ 端口: ${PORT}
║ AI员工: CEO/CFO/COO/CTO/CMO/Sales/Risk/CS (${Object.keys(orgEmployees).length}人)
║ 大模型: ${activeModels().map(m => m.id).join('/') || '未配置'}
╚══════════════════════════════════════════════════════════╝
  `);
  });
}

module.exports = app;