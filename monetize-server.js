const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { MonetizeEngine, PRODUCT_TYPES, PLATFORMS } = require('./monetize/monetize-engine');

const app = express();
const PORT = process.env.PORT || 3111;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'monetize', 'public')));

const engine = new MonetizeEngine({ outputDir: path.join(__dirname, 'monetize', 'generated') });

let aiCoreLoaded = false;
try {
  const { CommandCenter, CustomerServiceConsole, DecisionConsole } = require('./ai-core/command-center');
  const { AIEmployeeManager } = require('./ai-core/employees');
  const { financialSystem, salesManager } = require('./ai-core/finance');
  const { securitySystem, evolutionSystem } = require('./ai-core/security');
  const { aiBrain } = require('./ai-core/ai-brain');
  engine.ai = { CommandCenter, CustomerServiceConsole, DecisionConsole, AIEmployeeManager, financialSystem, salesManager, securitySystem, evolutionSystem, aiBrain };
  aiCoreLoaded = true;
  console.log('✅ AI 核心模块已挂载');
} catch (e) {
  console.log('⚠️ AI 核心模块加载跳过:', e.message);
}

app.get('/api/v1/dashboard', (req, res) => {
  res.json(engine.getFullStatus());
});

app.get('/api/v1/status', (req, res) => {
  res.json(engine.getDashboard());
});

app.post('/api/v1/engine/start', (req, res) => {
  const result = engine.start();
  res.json(result);
});

app.post('/api/v1/engine/stop', (req, res) => {
  const result = engine.stop();
  res.json(result);
});

app.get('/api/v1/product/types', (req, res) => {
  res.json(engine.productFactory.getSupportedTypes());
});

app.post('/api/v1/product/generate', (req, res) => {
  try {
    const product = engine.generateProduct(req.body || {});
    res.json({ success: true, product: {
      id: product.id, type: product.type, name: product.name,
      description: product.description, savedDir: product.savedDir,
      fileCount: Object.keys(product.files).length, createdAt: product.createdAt
    }});
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/v1/products', (req, res) => {
  res.json(engine.productFactory.list());
});

app.post('/api/v1/publish', (req, res) => {
  const { productId, platform } = req.body || {};
  try {
    const result = engine.publishProduct(productId, platform);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/v1/publish/stats', (req, res) => {
  res.json(engine.publisher.getStats());
});

app.post('/api/v1/simulate/sale', (req, res) => {
  const { listingId } = req.body || {};
  const sales = engine.publisher.simulateSales(listingId);
  if (!sales) return res.status(404).json({ error: 'listing not found', hint: '可先用 /api/v1/publish 发布产品再模拟销售' });
  res.json({ success: true, sales });
});

app.get('/api/v1/platforms', (req, res) => {
  res.json(engine.publisher.getPlatforms());
});

app.get('/api/v1/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(engine.getLogs(limit));
});

if (aiCoreLoaded) {
  app.get('/api/v1/ai/employees', (req, res) => {
    const manager = new engine.ai.AIEmployeeManager();
    res.json({ employees: manager.getAllEmployees() });
  });

  app.get('/api/v1/ai/finance', (req, res) => {
    res.json(engine.ai.financialSystem.getFinancialReport());
  });

  app.get('/api/v1/ai/security', (req, res) => {
    res.json({
      firewall: { enabled: engine.ai.securitySystem.firewall.enabled, rules: engine.ai.securitySystem.firewall.rules.length },
      auditLog: engine.ai.securitySystem.getAuditLog(20)
    });
  });

  app.post('/api/v1/ai/brain/think', async (req, res) => {
    const { prompt, context } = req.body || {};
    try {
      const result = await engine.ai.aiBrain.think(prompt, context);
      res.json({ success: true, result });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });
}

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: engine.watchdog.running ? 'running' : 'stopped',
    aiCore: aiCoreLoaded,
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'monetize', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('══════════════════════════════════════════════════════');
  console.log('      💰 全托管运营赚钱系统 v1.0');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  🌐 控制台:    http://localhost:${PORT}`);
  console.log(`  📊 状态API:   /api/v1/status`);
  console.log(`  📦 生成API:   /api/v1/product/generate (POST)`);
  console.log(`  📤 发布API:   /api/v1/publish (POST)`);
  console.log(`  💰 销售API:   /api/v1/simulate/sale (POST)`);
  console.log(`  ⏱️  值守API:   /api/v1/engine/start | /stop`);
  console.log(`  🖥️  健康API:   /api/v1/health`);
  console.log('══════════════════════════════════════════════════════');
});