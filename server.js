const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { ensureEnv } = require('./lib/env');
ensureEnv();

const app = express();
const PORT = 3003;

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const ARMY_CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'armies/config.json'), 'utf8'));
const PAYMENT_CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'moltspay.services.json'), 'utf8'));

const RATE_USD_TO_CNY = 7.5;

const state = {
  totalEarnings: 0,
  orderHistory: [],
  systemRunning: false,
  dailyTarget: 30000000,
  dailyEarned: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  autoOrderInterval: null
};

function saveState() {
  try {
    if (db) {
      db.prepare(`UPDATE stats SET total_earnings = ?, daily_earnings = ?, system_running = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`).run(state.totalEarnings, state.dailyEarned, state.systemRunning ? 1 : 0);
    }
    fs.writeFileSync(path.join(__dirname, 'state.json'), JSON.stringify({
      totalEarnings: state.totalEarnings,
      dailyEarned: state.dailyEarned,
      lastResetDate: state.lastResetDate,
      orderHistory: state.orderHistory.slice(0, 1000)
    }, null, 2));
  } catch (e) {
    console.error('保存状态失败:', e.message);
  }
}

function loadState() {
  try {
    if (db) {
      const stats = db.prepare('SELECT * FROM stats WHERE id = 1').get();
      if (stats) {
        state.totalEarnings = stats.total_earnings || 0;
        state.dailyEarned = stats.daily_earnings || 0;
        state.dailyTarget = stats.daily_target || 300000;
        state.systemRunning = stats.system_running === 1;
        state.lastResetDate = stats.last_reset_date;
      }
      const savedOrders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1000').all();
      if (savedOrders.length > 0) {
        state.orderHistory = savedOrders.map(o => ({
          id: o.id,
          serviceId: o.service_id,
          armyId: o.army_id,
          armyName: o.army_name,
          role: o.role,
          priceUSD: o.price_usd,
          priceCNY: o.price_cny,
          currency: o.currency,
          externalAI: o.external_ai,
          result: JSON.parse(o.result || '{}'),
          timestamp: o.timestamp
        }));
      }
    }
    if (fs.existsSync(path.join(__dirname, 'state.json'))) {
      const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'state.json'), 'utf8'));
      if (saved.orderHistory && saved.orderHistory.length > state.orderHistory.length) {
        state.orderHistory = saved.orderHistory;
      }
    }
    console.log('✅ 状态已恢复:', { totalEarnings: state.totalEarnings, dailyEarned: state.dailyEarned });
  } catch (e) {
    console.log('加载状态失败，使用默认:', e.message);
  }
}

const roleToServices = {
  content_writer: ['content-generation'],
  video_producer: ['video-generation'],
  developer: ['code-generation'],
  data_analyst: ['data-analysis'],
  translator: ['translation'],
  customer_service: ['customer-service'],
  marketer: ['marketing'],
  copywriter: ['content-generation', 'marketing'],
  designer: ['image-generation'],
  music_producer: ['video-generation'],
  '3d_modeler': ['image-generation', 'video-generation'],
  game_dev: ['code-generation'],
  ui_designer: ['image-generation', 'code-generation'],
  product_manager: ['data-analysis', 'marketing'],
  seo_expert: ['marketing', 'content-generation'],
  social_media: ['content-generation', 'marketing'],
  ecommerce: ['marketing', 'customer-service'],
  brand_planner: ['marketing', 'content-generation'],
  event_planner: ['content-generation', 'marketing'],
  researcher: ['data-analysis', 'content-generation'],
  editor: ['content-generation'],
  audio_engineer: ['video-generation'],
  animator: ['video-generation', 'image-generation'],
  tech_writer: ['content-generation', 'code-generation'],
  devops: ['code-generation'],
  security_expert: ['code-generation'],
  dba: ['code-generation', 'data-analysis'],
  cloud_engineer: ['code-generation'],
  ml_engineer: ['code-generation', 'data-analysis'],
  blockchain_dev: ['code-generation'],
  mobile_dev: ['code-generation'],
  frontend_dev: ['code-generation'],
  backend_dev: ['code-generation'],
  qa_engineer: ['code-generation'],
  qa_lead: ['data-analysis'],
  architect: ['code-generation', 'data-analysis'],
  tech_consultant: ['content-generation', 'data-analysis'],
  pm: ['data-analysis', 'marketing'],
  process_analyst: ['data-analysis'],
  financial_analyst: ['data-analysis'],
  accountant: ['data-analysis'],
  hr_specialist: ['content-generation', 'data-analysis'],
  recruiter: ['content-generation'],
  trainer: ['content-generation'],
  legal_counsel: ['content-generation'],
  compliance_officer: ['data-analysis'],
  risk_manager: ['data-analysis'],
  ir_specialist: ['content-generation', 'marketing'],
  ma_consultant: ['data-analysis', 'content-generation'],
  strategist: ['data-analysis', 'marketing'],
  market_researcher: ['data-analysis', 'content-generation'],
  competitor_analyst: ['data-analysis', 'content-generation'],
  ux_researcher: ['data-analysis', 'content-generation'],
  growth_hacker: ['marketing'],
  community_manager: ['content-generation', 'marketing'],
  content_manager: ['content-generation', 'marketing'],
  user_acquisition: ['marketing'],
  retention_expert: ['marketing', 'data-analysis'],
  monetization: ['marketing', 'data-analysis'],
  ad_manager: ['marketing'],
  affiliate_manager: ['marketing'],
  email_marketer: ['marketing', 'content-generation'],
  marketing_automation: ['marketing', 'code-generation'],
  crm_manager: ['data-analysis', 'marketing'],
  sales_rep: ['customer-service', 'marketing'],
  bd_specialist: ['marketing', 'customer-service'],
  cs_manager: ['customer-service', 'data-analysis'],
  solutions_architect: ['code-generation', 'data-analysis'],
  kam: ['marketing', 'customer-service'],
  channel_manager: ['marketing'],
  supply_chain: ['data-analysis'],
  logistics_coordinator: ['data-analysis'],
  warehouse_manager: ['data-analysis'],
  procurement: ['data-analysis'],
  supplier_manager: ['data-analysis'],
  quality_manager: ['data-analysis'],
  production_planner: ['data-analysis'],
  ie_engineer: ['data-analysis'],
  maintenance_engineer: ['code-generation'],
  energy_manager: ['data-analysis'],
  environmental_specialist: ['data-analysis'],
  safety_manager: ['data-analysis'],
  emergency_response: ['customer-service', 'data-analysis'],
  claims_adjuster: ['data-analysis'],
  healthcare_specialist: ['content-generation'],
  educator: ['content-generation'],
  tutor: ['content-generation'],
  assessment_specialist: ['data-analysis'],
  instructional_designer: ['content-generation'],
  knowledge_manager: ['content-generation', 'data-analysis'],
  research_support: ['content-generation', 'data-analysis'],
  patent_writer: ['content-generation'],
  academic_editor: ['content-generation'],
  data_labeler: ['data-analysis'],
  ai_trainer: ['data-analysis', 'code-generation'],
  model_evaluator: ['data-analysis'],
  prompt_engineer: ['content-generation', 'code-generation'],
  ai_ethics_reviewer: ['content-generation'],
  vtuber_manager: ['video-generation', 'content-generation'],
  command_center: ['data-analysis', 'marketing', 'content-generation']
};

const serviceHandlers = {
  'content-generation': { 
    price: 0.05, 
    provider: 'openai',
    handler: (params, army) => ({ 
      text: `【${army.name}】内容生成完成，主题：${params.topic || 'AI未来'}`, 
      wordCount: 500,
      title: 'AI未来发展趋势报告'
    })
  },
  'image-generation': { 
    price: 0.10, 
    provider: 'midjourney',
    handler: (params, army) => ({ 
      imageUrl: `https://cdn.smq.com/images/${army.id}-${Date.now()}.png`, 
      prompt: params.prompt || 'AI generated art',
      resolution: '1024x1024'
    })
  },
  'video-generation': { 
    price: 0.50, 
    provider: 'runway',
    handler: (params, army) => ({ 
      videoUrl: `https://cdn.smq.com/videos/${army.id}-${Date.now()}.mp4`, 
      duration: 30,
      resolution: '1080p'
    })
  },
  'code-generation': { 
    price: 1.00, 
    provider: 'claude',
    handler: (params, army) => ({ 
      code: `// Generated by ${army.name}\nconsole.log("Hello SMQ ' + army.name + '");`, 
      language: params.language || 'javascript',
      lines: 50
    })
  },
  'data-analysis': { 
    price: 0.30, 
    provider: 'chatgpt',
    handler: (params, army) => ({ 
      report: '数据分析报告', 
      charts: 3, 
      insights: 5,
      dataPoints: 1000
    })
  },
  'translation': { 
    price: 0.08, 
    provider: 'deepl',
    handler: (params, army) => ({ 
      translatedText: 'Translated by ' + army.name,
      sourceLang: params.sourceLang || 'en',
      targetLang: params.targetLang || 'zh'
    })
  },
  'customer-service': { 
    price: 0.15, 
    provider: 'chatgpt',
    handler: (params, army) => ({ 
      response: '您好，我是' + army.name + '，请问有什么可以帮助？', 
      satisfaction: 4.8,
      responseTime: '2s'
    })
  },
  'marketing': { 
    price: 0.25, 
    provider: 'openai',
    handler: (params, army) => ({ 
      campaign: '营销活动方案', 
      platforms: ['Facebook', 'Instagram'], 
      budget: '$500',
      reach: 10000
    })
  }
};

const armyStats = {};
ARMY_CONFIG.armies.forEach(army => {
  armyStats[army.id] = {
    armyId: army.id,
    armyName: army.name,
    role: army.role,
    agents: army.agents,
    dailyTarget: state.dailyTarget,
    dailyEarned: 0,
    totalEarned: 0,
    tasksCompleted: 0,
    servicesProvided: roleToServices[army.role] || ['content-generation'],
    externalAI: 'openai',
    status: 'idle',
    lastActive: null
  };
});

function checkDailyReset() {
  const today = new Date().toISOString().split('T')[0];
  if (state.lastResetDate !== today) {
    state.lastResetDate = today;
    state.dailyEarned = 0;
    Object.values(armyStats).forEach(a => {
      a.dailyEarned = 0;
      a.status = 'idle';
    });
    console.log('📅 每日数据已重置');
  }
}

function getServiceByArmy(army) {
  const availableServices = roleToServices[army.role] || ['content-generation'];
  const serviceId = availableServices[Math.floor(Math.random() * availableServices.length)];
  return { serviceId, ...serviceHandlers[serviceId] };
}

app.get('/api/services', (req, res) => {
  checkDailyReset();
  const services = PAYMENT_CONFIG.services.map(s => {
    const serviceOrders = state.orderHistory.filter(o => o.serviceId === s.id);
    const completed = serviceOrders.reduce((sum, o) => sum + o.priceCNY, 0);
    return {
      ...s,
      dailyTarget: state.dailyTarget,
      completed: Math.round(completed * 100) / 100,
      orderCount: serviceOrders.length
    };
  });
  res.json(services);
});

app.post('/api/order', (req, res) => {
  const { serviceId, armyId, params } = req.body;
  
  checkDailyReset();
  
  if (!serviceId || !armyId) {
    return res.status(400).json({ error: '请提供serviceId和armyId' });
  }
  
  const service = serviceHandlers[serviceId];
  const army = ARMY_CONFIG.armies.find(a => a.id === armyId);
  
  if (!service) {
    return res.status(400).json({ error: `服务不存在: ${serviceId}` });
  }
  if (!army) {
    return res.status(400).json({ error: `军团不存在: ${armyId}` });
  }

  try {
    const result = service.handler(params || {}, army);
    const priceUSD = service.price;
    const priceCNY = priceUSD * RATE_USD_TO_CNY;
    
    const order = {
      id: Date.now(),
      serviceId,
      armyId,
      armyName: army.name,
      role: army.role,
      priceUSD,
      priceCNY,
      currency: 'USDC',
      externalAI: service.provider,
      result,
      timestamp: new Date().toISOString()
    };
    
    state.orderHistory.unshift(order);
    state.totalEarnings += priceUSD;
    state.dailyEarned += priceCNY;
    
    armyStats[armyId].dailyEarned += priceCNY;
    armyStats[armyId].totalEarned += priceCNY;
    armyStats[armyId].tasksCompleted += 1;
    armyStats[armyId].lastActive = new Date().toISOString();
    armyStats[armyId].status = 'working';
    
    try {
      if (db) {
        db.prepare(`INSERT INTO orders (service_id, army_id, army_name, role, price_usd, price_cny, currency, external_ai, result, external) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(serviceId, armyId, army.name, army.role, priceUSD, priceCNY, 'USDC', service.provider, JSON.stringify(result));
      }
    } catch (e) {
      console.error('保存订单失败:', e.message);
    }
    
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/external/order', async (req, res) => {
  const { serviceId, params, chain, role } = req.body;
  
  checkDailyReset();
  
  if (!serviceId) {
    return res.status(400).json({ error: '请提供serviceId' });
  }
  
  const service = serviceHandlers[serviceId];
  if (!service) {
    return res.status(400).json({ error: `服务不存在: ${serviceId}` });
  }

  let army;
  if (role) {
    const matchingArmies = ARMY_CONFIG.armies.filter(a => a.role === role);
    if (matchingArmies.length > 0) {
      army = matchingArmies[Math.floor(Math.random() * matchingArmies.length)];
    } else {
      return res.status(400).json({ error: `角色不存在: ${role}`, availableRoles: Object.keys(roleToServices) });
    }
  } else {
    army = ARMY_CONFIG.armies[Math.floor(Math.random() * ARMY_CONFIG.armies.length)];
  }
  
  try {
    const army = ARMY_CONFIG.armies[Math.floor(Math.random() * ARMY_CONFIG.armies.length)];
    const result = service.handler(params || {}, army);
    const priceUSD = service.price;
    
    const order = {
      id: Date.now(),
      serviceId,
      armyId: army.id,
      armyName: army.name,
      role: army.role,
      priceUSD,
      priceCNY: priceUSD * RATE_USD_TO_CNY,
      currency: 'USDC',
      externalAI: service.provider,
      result,
      timestamp: new Date().toISOString(),
      external: true
    };
    
    state.orderHistory.unshift(order);
    state.totalEarnings += priceUSD;
    state.dailyEarned += priceUSD * RATE_USD_TO_CNY;
    
    armyStats[army.id].dailyEarned += priceUSD * RATE_USD_TO_CNY;
    armyStats[army.id].totalEarned += priceUSD * RATE_USD_TO_CNY;
    armyStats[army.id].tasksCompleted += 1;
    armyStats[army.id].lastActive = new Date().toISOString();
    
    if (db) {
      db.prepare(`INSERT INTO orders (service_id, army_id, army_name, role, price_usd, price_cny, currency, external_ai, result, external) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(
        serviceId, army.id, army.name, army.role, priceUSD, priceUSD * RATE_USD_TO_CNY, 'USDC', service.provider, JSON.stringify(result)
      );
    }
    
    res.json({ 
      success: true, 
      order,
      payment: {
        amount: priceUSD,
        currency: 'USDC',
        chain: chain || 'base',
        serviceId,
        description: service.name
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/external/services', (req, res) => {
  const services = PAYMENT_CONFIG.services.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price,
    currency: s.currency,
    chains: ['base', 'polygon']
  }));
  res.json({ services, provider: PAYMENT_CONFIG.provider });
});

app.get('/api/external/armies', (req, res) => {
  const armies = ARMY_CONFIG.armies.map(army => ({
    id: army.id,
    name: army.name,
    role: army.role,
    agents: army.agents,
    status: armyStats[army.id]?.status || 'ready',
    services: roleToServices[army.role] || []
  }));
  res.json({ armies, total: armies.length });
});

app.get('/api/earnings', (req, res) => {
  checkDailyReset();
  res.json({ 
    totalEarnings: state.totalEarnings, 
    currency: 'USDC', 
    totalCNY: state.totalEarnings * RATE_USD_TO_CNY,
    orderCount: state.orderHistory.length,
    dailyTarget: state.dailyTarget,
    dailyProgress: state.dailyEarned,
    dailyProgressPercent: Math.round((state.dailyEarned / state.dailyTarget) * 10000) / 100
  });
});

app.get('/api/armies', (req, res) => {
  checkDailyReset();
  const armiesWithStats = ARMY_CONFIG.armies.map(army => ({
    ...army,
    stats: armyStats[army.id]
  }));
  res.json(armiesWithStats);
});

app.get('/api/armies/:id', (req, res) => {
  const army = ARMY_CONFIG.armies.find(a => a.id === parseInt(req.params.id));
  if (!army) return res.status(404).json({ error: '军团不存在' });
  res.json({ ...army, stats: armyStats[army.id] });
});

app.get('/api/orders', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(state.orderHistory.slice(0, limit));
});

app.get('/api/system', (req, res) => {
  checkDailyReset();
  res.json({ 
    running: state.systemRunning, 
    dailyTarget: state.dailyTarget,
    dailyProgress: Math.round(state.dailyEarned * 100) / 100,
    dailyProgressPercent: Math.round((state.dailyEarned / state.dailyTarget) * 10000) / 100,
    armyCount: ARMY_CONFIG.armies.length,
    totalAgents: ARMY_CONFIG.total_agents,
    lastResetDate: state.lastResetDate
  });
});

app.post('/api/system/start', (req, res) => {
  if (state.systemRunning) {
    return res.json({ success: true, running: state.systemRunning, message: '系统已在运行中' });
  }
  
  checkDailyReset();
  state.systemRunning = true;
  state.dailyEarned = 0;
  Object.values(armyStats).forEach(a => {
    a.status = 'ready';
    a.dailyEarned = 0;
  });
  
  state.autoOrderInterval = setInterval(() => {
    if (!state.systemRunning) return;
    
    const currentDaily = Object.values(armyStats).reduce((sum, a) => sum + a.dailyEarned, 0);
    if (currentDaily >= state.dailyTarget) {
      console.log('✅ 今日目标已达成: ¥' + currentDaily);
      return;
    }
    
    const validArmies = ARMY_CONFIG.armies;
    const army = validArmies[Math.floor(Math.random() * validArmies.length)];
    const serviceInfo = getServiceByArmy(army);
    const service = serviceHandlers[serviceInfo.serviceId];
    const params = {};
    
    try {
      const result = service.handler(params, army);
      const priceUSD = service.price;
      const priceCNY = priceUSD * RATE_USD_TO_CNY;
      
      const order = {
        id: Date.now(),
        serviceId: serviceInfo.serviceId,
        armyId: army.id,
        armyName: army.name,
        role: army.role,
        priceUSD,
        priceCNY,
        currency: 'USDC',
        externalAI: service.provider,
        result,
        timestamp: new Date().toISOString()
      };
      
      state.orderHistory.unshift(order);
      state.totalEarnings += priceUSD;
      state.dailyEarned += priceCNY;
      
      armyStats[army.id].dailyEarned += priceCNY;
      armyStats[army.id].totalEarned += priceCNY;
      armyStats[army.id].tasksCompleted += 1;
      armyStats[army.id].lastActive = new Date().toISOString();
      armyStats[army.id].status = 'working';
      
      try {
        if (db) {
          db.prepare(`INSERT INTO orders (service_id, army_id, army_name, role, price_usd, price_cny, currency, external_ai, result, external) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(serviceInfo.serviceId, army.id, army.name, army.role, priceUSD, priceCNY, 'USDC', service.provider, JSON.stringify(result));
        }
      } catch (e) {
        console.error('保存自动订单失败:', e.message);
      }
      
      const dailyTotal = Object.values(armyStats).reduce((s, a) => s + a.dailyEarned, 0);
      console.log(`⚡ 自动下单: ${army.name} - ${serviceInfo.serviceId} +$${priceUSD} (今日: ¥${dailyTotal.toFixed(0)}/${state.dailyTarget})`);
    } catch (err) {
      console.error('自动下单失败:', err.message);
    }
  }, 3000);
  
  res.json({ success: true, running: state.systemRunning });
});

app.post('/api/system/stop', (req, res) => {
  if (!state.systemRunning) {
    return res.json({ success: true, running: state.systemRunning, message: '系统已停止' });
  }
  
  state.systemRunning = false;
  if (state.autoOrderInterval) {
    clearInterval(state.autoOrderInterval);
    state.autoOrderInterval = null;
  }
  Object.values(armyStats).forEach(a => a.status = 'idle');
  res.json({ success: true, running: state.systemRunning });
});

app.post('/api/system/reset', (req, res) => {
  const timestamp = new Date().toISOString();
  const backupFile = path.join(__dirname, `backup-${timestamp.replace(/[:.]/g, '-')}.json`);
  
  const externalOrders = state.orderHistory.filter(o => o.external);
  fs.writeFileSync(backupFile, JSON.stringify({
    backupTime: timestamp,
    totalEarnings: state.totalEarnings,
    dailyEarned: state.dailyEarned,
    orderCount: state.orderHistory.length,
    externalOrderCount: externalOrders.length,
    orders: state.orderHistory
  }, null, 2));
  
  checkDailyReset();
  state.totalEarnings = 0;
  state.dailyEarned = 0;
  state.orderHistory = externalOrders;
  
  if (db) {
    db.prepare('DELETE FROM orders WHERE external = 0').run();
    db.prepare(`UPDATE stats SET total_earnings = 0, daily_earnings = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1`).run();
  }
  
  Object.keys(armyStats).forEach(id => {
    armyStats[id].dailyEarned = 0;
  });
  
  saveState();
  res.json({ success: true, message: '模拟数据已清零，仅保留外部订单', backupFile });
});

app.get('/api/exchange', (req, res) => {
  res.json({
    rate: RATE_USD_TO_CNY,
    methods: [
      { name: 'Coinbase', url: 'https://www.coinbase.com', type: '交易所' },
      { name: 'Binance', url: 'https://www.binance.com', type: '交易所' },
      { name: 'OKX', url: 'https://www.okx.com', type: '交易所' },
      { name: 'Bybit', url: 'https://www.bybit.com', type: '交易所' }
    ],
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f4e5E5',
    email: 'supi24@163.com',
    provider: 'SMQ-Army-System'
  });
});

let db;
try {
  db = require('./database');
} catch (e) {
  console.log('⚠️ 数据库未初始化，使用内存存储');
}

loadState();

setInterval(() => {
  saveState();
  console.log('💾 自动保存状态...');
}, 30000);

let moltspayClient = null;
try {
  const { MoltsPayClient } = require('moltspay');
  const envKeyId = process.env.MOLTSPAY_KEY_ID || process.env.MOLTSPAY_API_KEY;
  const envKeySecret = process.env.MOLTSPAY_SECRET;
  let keyId = envKeyId, keySecret = envKeySecret, useMainnet = false;
  const configPath = path.join(__dirname, 'moltspay.config.json');
  if ((!keyId || !keySecret) && fs.existsSync(configPath)) {
    const moltspayConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    keyId = keyId || moltspayConfig.api.keyId;
    keySecret = keySecret || moltspayConfig.api.keySecret;
    useMainnet = moltspayConfig.api.useMainnet === true;
  }
  moltspayClient = new MoltsPayClient({
    keyId,
    keySecret,
    env: useMainnet ? 'mainnet' : 'testnet'
  });
  console.log('✅ MoltsPay 支付已配置');
} catch (e) {
  console.log('⚠️ MoltsPay 未配置:', e.message);
}

app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    database: db ? 'connected' : 'memory'
  };
  res.json(health);
});

process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获异常:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ 未处理拒绝:', reason);
});

app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║     🎖️ SMQ AI军团服务系统 v3.0                 ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  🌐 服务地址: http://localhost:${PORT}             ║`);
  console.log(`║  ⚔️ 军团数量: ${ARMY_CONFIG.armies.length}个                    ║`);
  console.log(`║  🤖 AI代理: ${ARMY_CONFIG.total_agents}名                     ║`);
  console.log(`║  💰 每日目标: ¥${state.dailyTarget.toLocaleString()}                    ║`);
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║  API端点:                                         ║');
  console.log('║  GET  /api/health     - 健康检查                   ║');
  console.log('║  GET  /api/services  - 服务列表                 ║');
  console.log('║  POST /api/order   - 下单                     ║');
  console.log('║  GET  /api/earnings - 收益统计                 ║');
  console.log('║  GET  /api/armies  - 军团列表                 ║');
  console.log('║  GET  /api/orders  - 订单记录                 ║');
  console.log('║  GET  /api/system  - 系统状态                   ║');
  console.log('║  POST /api/system/start - 启动系统              ║');
  console.log('║  POST /api/system/stop  - 停止系统            ║');
  console.log('║  POST /api/system/reset - 重置每日数据       ║');
  console.log('║  GET  /api/exchange - 兑换渠道                  ║');
  console.log('╚═══════════════════════════════════════════════════╝');
});
