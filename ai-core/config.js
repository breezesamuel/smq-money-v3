const path = require('path');
const { ensureEnv } = require('../lib/env');
ensureEnv(path.join(__dirname, '..', '.env'));

const MODEL_REGISTRY = {
  deepseek: {
    name: 'DeepSeek',
    kind: 'openai',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    keyEnv: 'DEEPSEEK_API_KEY',
    enabled: true
  },
  zhipu1: {
    name: '智谱AI (主)',
    kind: 'openai',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4',
    keyEnv: 'ZHIPU_API_KEY',
    enabled: true
  },
  zhipu2: {
    name: '智谱AI (备)',
    kind: 'openai',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4',
    keyEnv: 'ZHIPU_API_KEY_2',
    enabled: true
  },
  volcengine: {
    name: '火山引擎',
    kind: 'openai',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: '',
    keyEnv: 'VOLCENGINE_API_KEY',
    disabledReason: '需在控制台创建接入点(ep-*)或开通模型',
    enabled: false
  },
  kimi: {
    name: 'Kimi (Moonshot)',
    kind: 'openai',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
    keyEnv: 'KIMI_API_KEY',
    enabled: true
  },
  siliconflow: {
    name: '硅基流动',
    kind: 'openai',
    endpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    model: 'deepseek-ai/DeepSeek-V3',
    keyEnv: 'SILICONFLOW_API_KEY',
    enabled: true
  },
  minimax: {
    name: 'MiniMax',
    kind: 'minimax',
    endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    model: 'abab6.5s-chat',
    keyEnv: 'MINIMAX_API_KEY',
    enabled: true
  },
  agnes: {
    name: 'Agnes',
    kind: 'openai',
    endpoint: 'https://apihub.agnes-ai.com/v1/chat/completions',
    model: 'agnes-2.0-flash',
    keyEnv: 'AGNES_API_KEY',
    enabled: true
  },
  nvidia: {
    name: 'NVIDIA',
    kind: 'openai',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: '',
    keyEnv: 'NVIDIA_API_KEY',
    disabledReason: '端点已废弃(404/410/403)，需换 endpoint 或换 key',
    enabled: false
  }
};

function getKey(envName) {
  return process.env[envName] || '';
}

function buildConfig() {
  const result = {};
  for (const [id, cfg] of Object.entries(MODEL_REGISTRY)) {
    const key = getKey(cfg.keyEnv);
    result[id] = {
      ...cfg,
      apiKey: key,
      active: cfg.enabled && !!key
    };
  }
  return result;
}

function getModel(id) {
  return buildConfig()[id] || null;
}

function activeModels() {
  const all = buildConfig();
  return Object.entries(all)
    .filter(([, c]) => c.active)
    .map(([id, c]) => ({ id, name: c.name, model: c.model, endpoint: c.endpoint }));
}

module.exports = {
  MODEL_REGISTRY,
  buildConfig,
  getModel,
  activeModels,
  getKey,
  WALLETS: {
    baseUSDC: process.env.WALLET_BASE_USDC,
    evmDirect: process.env.WALLET_EVM_DIRECT,
    payout: process.env.WALLET_PAYOUT,
    payment: process.env.WALLET_PAYMENT,
    evm: process.env.WALLET_EVM,
    receive: process.env.WALLET_RECEIVE,
    solana: process.env.WALLET_SOLANA
  },
  ADMIN: {
    email: process.env.ADMIN_EMAIL,
    phone: process.env.ADMIN_PHONE,
    username: process.env.ADMIN_USERNAME
  }
};