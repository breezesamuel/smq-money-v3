const express = require('express');
const cors = require('cors');
const path = require('path');
const { AIEmployeeManager, AICEO, AICFO } = require('./ai-core/employees');
const { CommandCenter, CustomerServiceConsole, DecisionConsole } = require('./ai-core/command-center');
const { AIBrain, aiBrain } = require('./ai-core/ai-brain');
const { orgManager, orgEmployees, weeklyBoardMeeting, PROFILES } = require('./ai-core/ai-org');
const { modelRouter } = require('./ai-core/model-router');
const { activeModels, WALLETS, ADMIN } = require('./ai-core/config');
const { TranslationService, translator } = require('./ai-core/translation');
const { MultiLanguageUI, multiLang } = require('./ai-core/multilang');
const { FinancialSystem, ProcurementSystem, SalesManager, financialSystem, procurementSystem, salesManager } = require('./ai-core/finance');
const { SecuritySystem, EvolutionSystem, securitySystem, evolutionSystem } = require('./ai-core/security');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'ai-admin', 'index.html'));
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

// ===== AI 智能组织架构 (Smart Org) =====
app.get('/api/ai/org', (req, res) => {
  res.json({
    profiles: Object.entries(PROFILES).map(([role, p]) => ({ role, ...p, stats: orgEmployees[role].getStats() })),
    total: Object.keys(PROFILES).length,
    wallets: WALLETS
  });
});

app.post('/api/ai/org/:role/task', async (req, res) => {
  const role = req.params.role.toUpperCase();
  if (!orgEmployees[role]) return res.status(404).json({ error: 'unknown role' });
  const { kind, data } = req.body;
  try {
    const result = await orgEmployees[role].execute(kind || 'general_task', data || {});
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/ai/org/board-meeting', async (req, res) => {
  try {
    const result = await weeklyBoardMeeting(req.body || {});
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
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

module.exports = app;