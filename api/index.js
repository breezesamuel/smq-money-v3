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
const { track } = require('../report/analytics');

let aiApp = null;
function getAiApp() {
  if (!aiApp) aiApp = require('../ai-server');
  return aiApp;
}

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

// --- 持久化（Supabase kv 表；未配置时纯内存，行为不变）---
const store = require('./store');

// 冷启动恢复：内存无缓存且已配置 Supabase 时，从库中读取并合入内存
async function ensureUser(deviceId) {
  if (memoUsers.has(deviceId)) return memoUsers.get(deviceId);
  const u = findUser(deviceId);
  if (store.ready()) {
    try {
      const saved = await store.kvGet('user:' + deviceId);
      if (saved && saved.deviceId === deviceId) {
        Object.assign(u, saved);
        memoUsers.set(deviceId, u);
      }
    } catch (e) {}
  }
  return u;
}

// 异步写回（fire-and-forget，失败静默）
function persistUser(u) {
  if (!u || !u.deviceId) return;
  store.kvSet('user:' + u.deviceId, u).catch(() => {});
}

function toolPrice(toolId, data, type) {
  const t = data.tools.find(x => x.id === toolId);
  if (!t) return 0;
  return type === 'lifetime' ? t.pricing.lifetime : t.pricing.monthly;
}

// --- 订阅套餐（双语）。用户要求：英文 $9.9/月, $25/季, $99/年；中文 ¥60/月, ¥150/季, ¥500/年 ---
function subscriptionPlans() {
  return {
    en: { monthly: 9.9, quarterly: 25, yearly: 99, currency: 'USD' },
    zh: { monthly: 60, quarterly: 150, yearly: 500, currency: 'CNY' }
  };
}

// plan -> 赠送免费月数（用于购买订阅后开通全站）
const PLAN_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };

// 授权开通（支付确认/query 共用）：计入 license、计提 5% 推广费、返佣给邀请人
// 订阅类型同时按 PLAN_MONTHS 延长全站订阅到期时间（subscriptionUntil）
function grantAccess(deviceId, toolId, type, { source = 'pay', tools = [], plan } = {}) {
  const u = findUser(deviceId);
  const t = tools.find(x => x.id === toolId);
  if (!t) return { ok: false, error: '工具不存在' };
  let license = null;
  if (type === 'lifetime') license = 'lifetime';
  else {
    license = 'subscription';
    // 订阅 -> 全站解锁：延长 subscriptionsUntil（月/季/年对应 1/3/12 个月）
    const months = PLAN_MONTHS[plan] || 1;
    const base = new Date(u.subscriptionUntil || Date.now()).getTime();
    u.subscriptionUntil = new Date(base + months * 30 * 24 * 3600 * 1000).toISOString();
    persistUser(u);
  }
  if (!u.tools[toolId]) u.tools[toolId] = license;
  track('payConfirm', { amount: type === 'lifetime' ? t.pricing.lifetime : (plan ? PLAN_MONTHS[plan] : 1) * t.pricing.monthly, source, plan: plan || null });
  // 收入计提 5% 进推广费基金（自主投放预算）
  try {
    const { accrue } = require('../promo/fund');
    const amount = type === 'lifetime' ? t.pricing.lifetime : (plan ? PLAN_MONTHS[plan] : 1) * t.pricing.monthly;
    accrue(amount, { ref: deviceId + '/' + toolId });
  } catch (e) { /* fund 未配置时忽略 */ }

  // 返佣：被邀请者首次有效付费 -> 邀请人朋友数+1；按朋友数发放订阅月数奖励
  //   1位 -> +1月 / 3位 -> +3月 / 10位 -> +1年（累计已达到更高档则补足差额）
  if (u.referredBy && !u._bonusGiven) {
    let inviter = null;
    memoUsers.forEach(v => { if (v.referralCode === u.referredBy) inviter = v; });
    if (inviter) {
      const n = inviter.verifiedFriends || 0;
      const newN = n + 1;
      const ratio = n < 1 ? 0.10 : n < 2 ? 0.30 : n < 3 ? 0.50 : n < 5 ? 0.70 : 1.00;
      const paid = type === 'lifetime' ? t.pricing.lifetime : (plan ? PLAN_MONTHS[plan] : 1) * t.pricing.monthly;
      inviter.verifiedFriends = newN;
      inviter.bonusGiven = (inviter.bonusGiven || 0) + paid * ratio;
      // 订阅月数奖励
      const monthsFor = f => f >= 10 ? 12 : f >= 3 ? 3 : f >= 1 ? 1 : 0;
      const prevMonths = monthsFor(n);
      const nowMonths = monthsFor(newN);
      if (nowMonths > prevMonths) {
        const base = new Date(inviter.subscriptionUntil || Date.now()).getTime();
        inviter.subscriptionUntil = new Date(base + (nowMonths - prevMonths) * 30 * 24 * 3600 * 1000).toISOString();
      }
      track('referralBonus', { amount: paid * ratio, friends: newN });
      u._bonusGiven = true;
      if (inviter.verifiedFriends >= 10) inviter.freePermanent = true;
      persistUser(inviter);
    }
  }
  persistUser(u);
  return { ok: true, license: u.tools[toolId] };
}

function checkOne(deviceId, toolId, tool, data) {
  const freeUses = tool.pricing.freeUses || 10;
  const u = findUser(deviceId);
  const used = u.usage[toolId] || 0;
  const license = u.tools[toolId];
  // 全站订阅未到期 -> 该工具直接解锁
  if (u.subscriptionUntil && Date.now() < new Date(u.subscriptionUntil).getTime()) {
    return { allowed: true, reason: 'subscriber', remaining: Infinity, subscriptionUntil: u.subscriptionUntil };
  }
  if (u.freePermanent) return { allowed: true, reason: 'free_permanent', remaining: Infinity };
  if (license === 'lifetime' || license === 'subscription') return { allowed: true, reason: license, remaining: Infinity };
  if (used < freeUses) return { allowed: true, reason: 'free_trial', remaining: freeUses - used };
  return {
    allowed: false, reason: 'limit_reached', remaining: 0, used, freeUses,
    pricing: tool.pricing,
    upgrade: { monthly: tool.pricing.monthly, lifetime: tool.pricing.lifetime }
  };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/^\/api/, '').split('/').filter(Boolean);
  const q = Object.fromEntries(url.searchParams);
  const data = loadTools();
  const tools = data.tools;

  // /api/ai/* -> AI 智能员工架构（express app 直接代理）
  if (p[0] === 'ai') {
    delete req.headers['content-length'];
    return getAiApp()(req, res);
  }

  // POST /api/alipay/notify - 支付宝异步通知（form-encoded，验签后开通+计提）
  if (p[0] === 'alipay' && p[1] === 'notify' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      try {
        const alipay = require('./alipay');
        const params = alipay.parseNotifyForm(raw);
        const signValue = params.sign;
        delete params.sign;
        delete params.sign_type;
        const ok = alipay.verify(params, signValue);
        const tradeStatus = params.trade_status;
        const passback = params.passback_params ? Buffer.from(params.passback_params, 'base64').toString('utf8') : '';
        let pb = {};
        try { pb = JSON.parse(passback); } catch (e) {}
        if (ok && tradeStatus === 'TRADE_SUCCESS') {
          if (pb.deviceId && pb.toolId) {
            track('alipayNotify', { amount: Number(params.total_amount || 0) });
            grantAccess(pb.deviceId, pb.toolId, pb.type === 'lifetime' ? 'lifetime' : 'subscription', { source: 'alipay-notify', tools });
          }
          res.setHeader('Content-Type', 'text/plain');
          res.status(200).end('success');
        } else {
          res.setHeader('Content-Type', 'text/plain');
          res.status(200).end('fail');
        }
      } catch (e) {
        res.setHeader('Content-Type', 'text/plain');
        res.status(200).end('fail');
      }
    });
    return;
  }

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
  if (p[0] === 'pricing' && req.method === 'GET') {
    return json(res, { ...data.pricingRules, plans: subscriptionPlans() });
  }

  // GET /api/referral?deviceId=
  if (p[0] === 'referral' && req.method === 'GET') {
    const u = await ensureUser(q.deviceId || 'anon');
    return json(res, {
      referralCode: u.referralCode, verifiedFriends: u.verifiedFriends,
      tiers: data.pricingRules.referral,
      bonusEarned: Math.round((u.bonusGiven || 0) * 100) / 100,
      freePermanent: !!u.freePermanent,
      subscriptionUntil: u.subscriptionUntil || null
    });
  }

  // GET /api/health
  if (p[0] === 'health') return json(res, { status: 'ok', tools: data.stats.total, time: new Date().toISOString() });

  // GET /api/feedback 反馈列表（管理用，需 FEEDBACK_ADMIN_KEY）
  if (p[0] === 'feedback' && p.length === 1 && req.method === 'GET') {
    const adminKey = process.env.FEEDBACK_ADMIN_KEY || '';
    if (!adminKey || q.key !== adminKey) return json(res, { error: 'unauthorized' }, 401);
    const { listFeedback } = require('../feedback/feedback-queue');
    return json(res, { items: listFeedback() });
  }

  // GET /api/leaderboard/top?limit= 全站热门榜（按参与人数）
  if (p[0] === 'leaderboard' && p[1] === 'top' && req.method === 'GET') {
    const arcade = require('../arcade-data.js');
    const { readFileSync } = require('fs');
    let heats = {};
    try {
      const store = JSON.parse(readFileSync(require('path').join(__dirname, '..', 'leaderboard', 'leaderboard.json'), 'utf8'));
      heats = (store && store.entries) ? store.entries : {};
    } catch (e) { /* 无持久数据 */ }
    const limit = Math.min(parseInt(q.limit) || 50, 50);
    const games = (arcade || [])
      .map(g => ({ id: g.id, title: g.title, theme: g.theme, engineName: g.engineName, players: (heats[g.id] || []).length, topScore: (heats[g.id] || []).length ? heats[g.id][0].score : 0 }))
      .sort((a, b) => b.players - a.players || b.topScore - a.topScore)
      .slice(0, limit);
    return json(res, { top: games });
  }

  // GET /api/leaderboard/insights 热门游戏自动心得
  if (p[0] === 'leaderboard' && p[1] === 'insights' && req.method === 'GET') {
    const arcade = require('../arcade-data.js');
    const games = (arcade || []).slice(0, 3)
      .map(g => ({ id: g.id, title: g.title, theme: g.theme, category: g.category, pain: g.pain }));
    return json(res, { insights: games.map(g => ({
      gameId: g.id, title: g.title,
      tip: `🔥 ${g.title} — ${g.theme}题材。多人对战冲击高分的秘诀：前10分钟免费时长里请先练熟节奏，之后按¥0.2/分钟继续冲榜。`,
      tag: g.theme
    })).concat({ gameId: 'overall', title: '全站', tip: '每天都有新游戏上线，记得常来刷新你的高分记录！' }) });
  }

  // GET /api/leaderboard/:gameId?top= 排行榜
  if (p[0] === 'leaderboard' && p[1] && req.method === 'GET') {
    const { topList } = require('../leaderboard/leaderboard-store');
    const top = Math.min(parseInt(q.top) || 10, 50);
    return json(res, { gameId: p[1], top, items: topList(p[1], top) });
  }

  // ---- SEO 基建 ----
  // GET /api/sitemap.xml
  if (p[0] === 'sitemap.xml') {
    const { generateSitemap } = require('./seo');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.end(generateSitemap());
  }
  // GET /api/robots.txt
  if (p[0] === 'robots.txt') {
    const { generateRobots } = require('./seo');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end(generateRobots());
  }
  // GET /api/rss.xml
  if (p[0] === 'rss.xml') {
    const { generateRss } = require('./seo');
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    return res.end(generateRss());
  }
  // GET /api/sx/arcade/<id>.json - 单游戏结构化数据
  if (p[0] === 'sx' && p[1] === 'arcade' && p[2]) {
    const { gameStructuredData, generateSitemap } = require('./seo');
    const games = require('../arcade-data.js');
    const game = games.find(g => g.id === p[2]);
    if (!game) return notFound(res, '游戏不存在: ' + p[2]);
    return json(res, gameStructuredData(game));
  }

  // GET /api/pay/methods 支付方式状态
  if (p[0] === 'pay' && p[1] === 'methods' && req.method === 'GET') {
    return json(res, paymentProviderStatus());
  }

  if (req.method !== 'POST') return json(res, { error: 'method not allowed' }, 405);

  readBody(req, async body => {
    if (!body) return badRequest(res, 'JSON body 无效');

    // POST /api/feedback 用户反馈收集
    if (p[0] === 'feedback' && p.length === 1) {
      const msg = String(body.message || '').trim();
      if (!msg) return badRequest(res, '需要 message');
      if (msg.length > 2000) return badRequest(res, 'message 过长');
      const rec = {
        id: 'fb_' + Date.now().toString(36).toUpperCase(),
        page: String(body.page || '').slice(0, 200),
        pageTitle: String(body.pageTitle || '').slice(0, 120),
        lang: String(body.lang || ''),
        type: ['pain', 'suggestion', 'bug', 'other'].includes(body.type) ? body.type : 'other',
        contact: String(body.contact || '').slice(0, 200),
        message: msg,
        createdAt: new Date().toISOString()
      };
      const { addFeedback } = require('../feedback/feedback-queue');
      const saved = addFeedback(rec);
      track('feedback', { detail: { types: { [rec.type]: 1 }, pages: { [rec.page || 'unknown']: 1 } }, _inc: true });
      return json(res, { success: true, id: rec.id, saved });
    }

    // POST /api/score 提交街机分数
    if (p[0] === 'score' && p.length === 1) {
      const gameId = String(body.gameId || '');
      const score = parseInt(body.score);
      if (!gameId || isNaN(score) || score < 0) return badRequest(res, '需要 gameId 和有效 score');
      const games = require('../arcade-data.js');
      if (!games.find(g => g.id === gameId)) return badRequest(res, '游戏不存在: ' + gameId);
      const player = String(body.player || '').slice(0, 32) || '匿名玩家';
      const { addScore, topList } = require('../leaderboard/leaderboard-store');
      const entry = { player, score, ts: Date.now(), deviceId: body.deviceId || '' };
      const rank = addScore(gameId, entry);
      track('score', { detail: { topGames: { [gameId]: 1 } }, _inc: true });
      const top = topList(gameId, 10);
      const isTop = rank.rank <= 50;
      return json(res, { success: true, rank: rank.rank, total: rank.total, top, isTopIn50: isTop });
    }

    // POST /api/user 识别/注册
    if (p[0] === 'user') {
      if (!body.deviceId) return badRequest(res, '需要 deviceId');
      const u = await ensureUser(body.deviceId);
      if (body.referredBy && !u.referredBy) { u.referredBy = body.referredBy; persistUser(u); }
      track('user');
      return json(res, { success: true, user: { deviceId: u.deviceId, referralCode: u.referralCode, verifiedFriends: u.verifiedFriends, referredBy: u.referredBy } });
    }

    // POST /api/check
    if (p[0] === 'check') {
      if (!body.toolId) return badRequest(res, '需要 toolId');
      const tool = tools.find(t => t.id === body.toolId);
      if (!tool) return notFound(res, '工具不存在');
      await ensureUser(body.deviceId || 'anon');
      track('check');
      return json(res, checkOne(body.deviceId || 'anon', body.toolId, tool, data));
    }

    // POST /api/use
    if (p[0] === 'use') {
      if (!body.toolId) return badRequest(res, '需要 toolId');
      const u = await ensureUser(body.deviceId || 'anon');
      if (!u.usage[body.toolId]) u.usage[body.toolId] = 0;
      u.usage[body.toolId]++;
      track('use', { detail: { topTools: { [body.toolId]: 1 } } });
      persistUser(u);
      return json(res, { success: true, used: u.usage[body.toolId] });
    }

    // POST /api/pay 发起支付（真实网关优先，回退演示）
    // body: { deviceId, toolId, type: subscription|lifetime, plan?: monthly|quarterly|yearly, lang?: en|zh }
    if (p[0] === 'pay' && p.length === 1 && !p[1]) {
      if (!body.toolId) return badRequest(res, '需要 toolId');
      await ensureUser(body.deviceId || 'anon');
      const tool = tools.find(t => t.id === body.toolId);
      if (!tool) return notFound(res, '工具不存在');
      const type = body.type === 'lifetime' ? 'lifetime' : 'subscription';
      const lang = body.lang === 'en' ? 'en' : 'zh';
      const plans = subscriptionPlans();
      let amount, plan = body.plan, descSuffix = '';
      if (type === 'lifetime') {
        amount = tool.pricing.lifetime;
        descSuffix = '买断';
      } else {
        plan = plan && plans[lang][plan] ? plan : 'monthly';
        amount = plans[lang][plan];
        const label = { monthly: lang === 'en' ? 'Monthly' : '包月', quarterly: lang === 'en' ? 'Quarterly' : '包季', yearly: lang === 'en' ? 'Yearly' : '包年' }[plan];
        descSuffix = label;
      }
      const orderId = 'pay_' + Date.now().toString(36).toUpperCase();
      const desc = `开通「${tool.name.zh.title}」${descSuffix}`;
      track('payOrder');

      return createLiveOrder({ toolId: tool.id, toolName: desc, amountCNY: amount, type, deviceId: body.deviceId || 'anon', plan })
        .then(gateway => json(res, {
          success: true, orderId, toolId: tool.id, type, plan: plan || null, amount, currency: lang === 'en' ? 'USD' : 'CNY',
          monthly: tool.pricing.monthly, lifetime: tool.pricing.lifetime,
          description: desc,
          gateway,
          payUrl: gateway && gateway.live && gateway.payUrl
            ? gateway.payUrl
            : `/api/pay/confirm?orderId=${orderId}`,
          demo: !(gateway && gateway.live)
        }))
        .catch(e => json(res, {
          success: true, orderId, toolId: tool.id, type, plan: plan || null, amount, currency: lang === 'en' ? 'USD' : 'CNY',
          description: desc, gateway: { live: false, errors: [e.message] },
          payUrl: `/api/pay/confirm?orderId=${orderId}`, demo: true
        }));
    }

    // POST /api/pay/confirm 确认支付 -> 开通许可 + 返佣（仅 demo 环境直付；真实收款已配置时必须带已支付订单号）
    if (p[0] === 'pay' && p[1] === 'confirm') {
      const { deviceId, toolId, type, orderId, plan } = body;
      if (!deviceId || !toolId) return badRequest(res, '需要 deviceId/toolId');
      // 冷启动先从库恢复，避免新建空用户覆盖已存邀请关系/累计
      await ensureUser(deviceId);
      let alipay = null;
      try { alipay = require('./alipay'); } catch (e) { alipay = null; }
      // 安全：真实收款(支付宝)已配置时，confirm 必须携带已支付订单号，防止绕过支付白嫖授权
      if (alipay && alipay.ready()) {
        if (!orderId) return badRequest(res, '真实收款模式需携带 orderId');
        let q = null;
        try { q = await alipay.queryTrade(orderId); } catch (e) { q = { ok: false, error: e.message }; }
        const status = q && q.status;
        if (!(q && q.ok && (status === 'TRADE_SUCCESS' || status === 'TRADE_FINISHED'))) {
          return json(res, { success: false, paid: false, status: status || null, error: '订单未支付' }, 402);
        }
      }
      const g = grantAccess(deviceId, toolId, type, { source: 'confirm', tools, plan });
      if (!g.ok) return notFound(res, g.error);
      return json(res, { success: true, status: 'paid', license: g.license, message: '支付成功已开通' });
    }

    // POST /api/pay/query 主动核验订单（支付宝返回收银台后调用）-> 已支付则立即开通
    if (p[0] === 'pay' && p[1] === 'query') {
      const { deviceId, toolId, type, orderId, plan } = body;
      if (!deviceId || !toolId || !orderId) return badRequest(res, '需要 deviceId/toolId/orderId');
      // 冷启动先从库恢复，避免新建空用户覆盖已存邀请关系/累计
      await ensureUser(deviceId);
      const u = await ensureUser(deviceId);
      if (u.tools[toolId]) return json(res, { success: true, paid: true, already: true, license: u.tools[toolId] });
      let alipay = null;
      try { alipay = require('./alipay'); } catch (e) { alipay = null; }
      if (!alipay || !alipay.ready()) return json(res, { success: true, paid: false, reason: 'alipay-unavailable' });
      let q = null;
      try { q = await alipay.queryTrade(orderId); } catch (e) { q = { ok: false, error: e.message }; }
      const status = q && q.status;
      if (q && q.ok && (status === 'TRADE_SUCCESS' || status === 'TRADE_FINISHED')) {
        const g = grantAccess(deviceId, toolId, type || 'subscription', { source: 'query', tools, plan });
        return json(res, { success: true, paid: true, status, license: g && g.license, message: '支付核验成功已开通' });
      }
      return json(res, { success: true, paid: false, status: status || null, reason: q && q.error || 'pending' });
    }

    return notFound(res, 'Unknown POST endpoint');
  });
};

module.exports.checkOne = checkOne;
module.exports.findUser = findUser;
module.exports.memoUsers = memoUsers;