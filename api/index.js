// Vercel Serverless 总入口 - 处理所有 /api/* 请求
// 综合 API:
//   GET  /api/tools           工具列表 (category/q/lang/page/per)
//   GET  /api/tools/:id       工具详情
//   POST /api/user            识别/注册用户 (含推荐码)
//   POST /api/check           检查免费试用剩余次数
//   POST /api/use             记录1次使用
//   POST /api/pay             发起支付 (subscription|lifetime)
//   POST /api/pay/confirm     确认支付并开通
//   GET  /api/referral       推荐进度
//   GET  /api/pricing         定价与返佣规则
//   GET  /api/health
const { loadTools, setCors, json, notFound, badRequest } = require('./lib');
const { createLiveOrder, paymentProviderStatus } = require('./payments');

function readBody(req, cb) {
  let body = '';
  req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on('end', () => { try { cb(body ? JSON.parse(body) : {}); } catch (e) { cb(null); } });
}

function generateReferralCode(seed) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = (seed || '') + Date.now();
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  let code = '';
  for (let i = 0; i < 6; i++) { code += chars[hash % chars.length]; hash = (hash / chars.length) >>> 0; }
  return code;
}

const memoUsers = new Map();

function findUser(deviceId) {
  let u = memoUsers.get(deviceId);
  if (!u) {
    u = { deviceId, referralCode: generateReferralCode(deviceId), referredBy: null, verifiedFriends: 0, usage: {}, tools: {}, createdAt: new Date().toISOString() };
    memoUsers.set(deviceId, u);
  }
  return u;
}

function toolPrice(toolId, data, type) {
  const t = data.tools.find(x => x.id === toolId);
  if (!t) return 0;
  return type === 'lifetime' ? t.pricing.lifetime : t.pricing.monthly;
}

function checkOne(deviceId, toolId, tool, data) {
  const freeUses = tool.pricing.freeUses || 10;
  const u = findUser(deviceId);
  const used = u.usage[toolId] || 0;
  const license = u.tools[toolId];
  if (u.freePermanent) return { allowed: true, reason: 'free_permanent', remaining: Infinity };
  if (license === 'lifetime' || license === 'subscription') return { allowed: true, reason: license, remaining: Infinity };
  if (used < freeUses) return { allowed: true, reason: 'free_trial', remaining: freeUses - used };
  return {
    allowed: false, reason: 'limit_reached', remaining: 0, used, freeUses,
    pricing: tool.pricing,
    upgrade: { monthly: tool.pricing.monthly, lifetime: tool.pricing.lifetime }
  };
}

module.exports = (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/^\/api/, '').split('/').filter(Boolean);
  const q = Object.fromEntries(url.searchParams);
  const data = loadTools();
  const tools = data.tools;

  // GET /api/tools
  if (p[0] === 'tools' && p.length === 1 && req.method === 'GET') {
    const cat = q.category, query = (q.q || '').toLowerCase(), lang = q.lang || 'zh';
    const page = parseInt(q.page) || 1, per = parseInt(q.per) || 50;
    let list = tools;
    if (cat) list = list.filter(t => t.category === cat);
    if (query) list = list.filter(t => t.slug.includes(query) || (t.name?.zh?.title || '').includes(query));
    return json(res, {
      total: list.length, page, per, pages: Math.ceil(list.length / per),
      categories: data.categories, stats: data.stats,
      tools: list.slice((page - 1) * per, page * per)
        .map(t => ({ id: t.id, slug: t.slug, category: t.category, type: t.type, pricing: t.pricing, name: t.name[lang] || t.name.zh }))
    });
  }

  // GET /api/tools/:id
  if (p[0] === 'tools' && p.length === 2 && req.method === 'GET') {
    const tool = tools.find(t => t.id === p[1]);
    if (!tool) return notFound(res, '工具不存在: ' + p[1]);
    const lang = q.lang || 'zh';
    return json(res, { ...tool, name: tool.name[lang] || tool.name.zh, allLanguages: tool.name, pricingRules: data.pricingRules });
  }

  // GET /api/pricing
  if (p[0] === 'pricing' && req.method === 'GET') return json(res, data.pricingRules);

  // GET /api/referral?deviceId=
  if (p[0] === 'referral' && req.method === 'GET') {
    const u = findUser(q.deviceId || 'anon');
    return json(res, {
      referralCode: u.referralCode, verifiedFriends: u.verifiedFriends,
      tiers: data.pricingRules.referral,
      bonusEarned: Math.round(u.bonusGiven || 0 * 100) / 100,
      freePermanent: !!u.freePermanent
    });
  }

  // GET /api/health
  if (p[0] === 'health') return json(res, { status: 'ok', tools: data.stats.total, time: new Date().toISOString() });

  // GET /api/pay/methods 支付方式状态
  if (p[0] === 'pay' && p[1] === 'methods' && req.method === 'GET') {
    return json(res, paymentProviderStatus());
  }

  if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);

  readBody(req, body => {
    if (!body) return badRequest(res, 'JSON body 无效');

    // POST /api/user 识别/注册
    if (p[0] === 'user') {
      if (!body.deviceId) return badRequest(res, '需要 deviceId');
      const u = findUser(body.deviceId);
      if (body.referredBy && !u.referredBy) u.referredBy = body.referredBy;
      return json(res, { success: true, user: { deviceId: u.deviceId, referralCode: u.referralCode, verifiedFriends: u.verifiedFriends, referredBy: u.referredBy } });
    }

    // POST /api/check
    if (p[0] === 'check') {
      if (!body.toolId) return badRequest(res, '需要 toolId');
      const tool = tools.find(t => t.id === body.toolId);
      if (!tool) return notFound(res, '工具不存在');
      return json(res, checkOne(body.deviceId || 'anon', body.toolId, tool, data));
    }

    // POST /api/use
    if (p[0] === 'use') {
      if (!body.toolId) return badRequest(res, '需要 toolId');
      const u = findUser(body.deviceId || 'anon');
      if (!u.usage[body.toolId]) u.usage[body.toolId] = 0;
      u.usage[body.toolId]++;
      return json(res, { success: true, used: u.usage[body.toolId] });
    }

    // POST /api/pay 发起支付（真实网关优先，回退演示）
    if (p[0] === 'pay' && p.length === 1 && !p[1]) {
      if (!body.toolId) return badRequest(res, '需要 toolId');
      const tool = tools.find(t => t.id === body.toolId);
      if (!tool) return notFound(res, '工具不存在');
      const type = body.type === 'lifetime' ? 'lifetime' : 'subscription';
      const amount = type === 'lifetime' ? tool.pricing.lifetime : tool.pricing.monthly;
      const orderId = 'pay_' + Date.now().toString(36).toUpperCase();
      const desc = `开通「${tool.name.zh.title}」${type === 'lifetime' ? '买断' : '包月'}`;

      return createLiveOrder({ toolId: tool.id, toolName: desc, amountCNY: amount, type, deviceId: body.deviceId || 'anon' })
        .then(gateway => json(res, {
          success: true, orderId, toolId: tool.id, type, amount, currency: 'CNY',
          monthly: tool.pricing.monthly, lifetime: tool.pricing.lifetime,
          description: desc,
          gateway,
          payUrl: gateway && gateway.live && gateway.payUrl
            ? gateway.payUrl
            : `/api/pay/confirm?orderId=${orderId}`,
          demo: !(gateway && gateway.live)
        }))
        .catch(e => json(res, {
          success: true, orderId, toolId: tool.id, type, amount, currency: 'CNY',
          description: desc, gateway: { live: false, errors: [e.message] },
          payUrl: `/api/pay/confirm?orderId=${orderId}`, demo: true
        }));
    }

    // POST /api/pay/confirm 确认支付 -> 开通许可 + 返佣
    if (p[0] === 'pay' && p[1] === 'confirm') {
      const { deviceId, toolId, type } = body;
      if (!deviceId || !toolId) return badRequest(res, '需要 deviceId/toolId');
      const u = findUser(deviceId);
      const t = tools.find(x => x.id === toolId);
      if (!t) return notFound(res, '工具不存在');
      u.tools[toolId] = type === 'lifetime' ? 'lifetime' : 'subscription';

      // 返佣：被邀请者首次有效付费 -> 邀请人等级+1
      if (u.referredBy && !u._bonusGiven) {
        let inviter = null;
        memoUsers.forEach(v => { if (v.referralCode === u.referredBy) inviter = v; });
        if (inviter) {
          const n = inviter.verifiedFriends || 0;
          const ratio = n < 1 ? 0.10 : n < 2 ? 0.30 : n < 3 ? 0.50 : n < 5 ? 0.70 : 1.00;
          const paid = type === 'lifetime' ? t.pricing.lifetime : t.pricing.monthly;
          inviter.verifiedFriends = n + 1;
          inviter.bonusGiven = (inviter.bonusGiven || 0) + paid * ratio;
          u._bonusGiven = true;
          if (inviter.verifiedFriends >= 10) inviter.freePermanent = true;
        }
      }
      return json(res, { success: true, status: 'paid', license: u.tools[toolId], message: '支付成功已开通' });
    }

    return notFound(res, 'Unknown POST endpoint');
  });
};

module.exports.checkOne = checkOne;
module.exports.findUser = findUser;
module.exports.memoUsers = memoUsers;