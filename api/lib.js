const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 内存回退（未配置 Supabase 时本地运行用）
const memoryDb = {
  users: new Map(), licenses: new Map(), usages: new Map(), payments: [],
  referrals: []
};

function loadTools() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools-data', 'tools.json'), 'utf8'));
    return data;
  } catch (e) {
    return { tools: [], stats: { total: 0 }, pricingRules: {} };
  }
}

function generateReferralCode(deviceId) {
  return deviceId.slice(0, 2) + '_' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, obj, code = 200) {
  if (typeof res.json === 'function') return res.status(code).json(obj);
  res.statusCode = code;
  return res.json ? res.json(obj) : (res.send ? res.send(JSON.stringify(obj)) : obj);
}

function notFound(res, msg) {
  return json(res, { error: msg || 'Not found' }, 404);
}

function badRequest(res, msg) {
  return json(res, { error: msg }, 400);
}

function internal(res, msg) {
  return json(res, { error: msg }, 500);
}

// =============== 免费使用10次判定 + 许可检查 ===============
function checkAccess(deviceId, toolId, delegates) {
  const usage = delegates.getUsageCount(deviceId, toolId);
  const tool = delegates.getTool(toolId);
  if (!tool) return { allowed: false, reason: 'tool_not_found' };

  const license = delegates.getLicense(deviceId, toolId);
  const hasPerm = license === 'lifetime' || license === 'free_permanent';
  const hasSub = license === 'subscription';

  if (hasPerm) return { allowed: true, reason: 'permanent', remaining: Infinity };
  if (hasSub) return { allowed: true, reason: 'subscriber', remaining: Infinity };

  const freeUses = (tool.pricing && tool.pricing.freeUses) || 10;
  if (usage < freeUses) {
    return { allowed: true, reason: 'free_trial', remaining: freeUses - usage };
  }
  // 免费次数用完
  return {
    allowed: false, reason: 'limit_reached',
    remaining: 0,
    pricing: tool.pricing,
    upgrade: {
      monthly: tool.pricing.monthly,
      lifetime: tool.pricing.lifetime
    }
  };
}

module.exports = {
  loadTools, generateReferralCode, setCors, json, notFound, badRequest, internal,
  checkAccess, memoryDb
};