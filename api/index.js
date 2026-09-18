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

// --- 分钟计费计系统 ---
// 计费规则：前10分钟免费， thereafter ¥0.2/分钟
// AI免费加时：每次可免费增加10分钟，每日上限3次，累计时长不计入计费
// 用户状态存储（内存态，Serverless 重启会清空，真实持久化待接 Supabase/KV）
const payUsers = new Map(); // deviceId -> { minutesUsed: number, freeMinutes: number, freeDailyCount: number, totalFreeAdded: number }

function getPayUser(deviceId) {
  let u = payUsers.get(deviceId);
  if (!u) {
    u = { minutesUsed: 0, freeMinutes: 10, freeDailyCount: 0, totalFreeAdded: 0 };
    payUsers.set(deviceId, u);
  }
  return u;
}

// 核心计费：消耗分钟（用于每分钟心跳扣费）
function consumeMinute(deviceId) {
  const u = getPayUser(deviceId);
  // 如果有未消耗的免费分钟，先扣免费分钟
  if (u.freeMinutes > 0) {
    u.freeMinutes--;
    u.minutesUsed++; // 计入总用时（用于计费统计，免费部分不计费）
    return { kind: 'free', minutesConsumed: 1, remainingFree: u.freeMinutes };
  }
  // 否则按 ¥0.2 计费（这里仅记录，实际扣费由 recharge 接口处理）
  u.minutesUsed++;
  return { kind: 'paid', minutesConsumed: 1, costCNY: 0.2 };
}

// 免费增加时长（AI 赠送）
function addFreeMinutes(deviceId, minutes) {
  const u = getPayUser(deviceId);
  // 每次最多 10分钟，每日上限 3次，累计总免费不限制（仅计入 freeDailyCount 计费豁免）
  if (u.freeDailyCount >= 3) return { added: 0, reason: 'daily limit reached' };
  u.freeMinutes = Math.min(u.freeMinutes + minutes, 30); // 单次上限 30 分钟防止滥用
  u.freeDailyCount++;
  u.totalFreeAdded += minutes;
  return { added: minutes, reason: 'ok' };
}

// 接口：GET /api/pay/balance - 查询用户分钟余额
function handlePayBalance(req, res) {
  const url = new URL(req.url, 'http://x');
  const q = Object.fromEntries(url.searchParams);
  const deviceId = q.deviceId || 'anon';
  const u = getPayUser(deviceId);
  // remainingFree：还剩多少免费分钟（用于前端计时器展示）
  const remainingFree = u.freeMinutes;
  // totalUsed：已用总分钟数（免费+付费，用于展示）
  const totalUsed = u.minutesUsed;
  // 计费统计：已计费分钟数（不包含免费部分）
  const chargedMinutes = Math.max(0, totalUsed - 10); // 前10分钟免费
  const chargeAmount = chargedMinutes * 0.2;
  return res.json({
    deviceId,
    freeMinutes: remainingFree,
    totalMinutes: totalUsed,
    chargedMinutes,
    amountCNY: chargeAmount,
    // 计费规则说明
    rules: 'free first 10 min, then ¥0.2/min, AI can add 10min free once per day (max 3 times/day)'
  });
}

// 接口：POST /api/pay/heartbeat - 心跳扣费（每分钟触发）
function handlePayHeartbeat(req, res) {
  const url = new URL(req.url, 'http://x');
  const q = Object.fromEntries(url.searchParams);
  const deviceId = q.deviceId || req.body.deviceId || 'anon';
  const u = getPayUser(deviceId);
  const result = consumeMinute(deviceId);
  if (result.kind === 'free') {
    track('playHeartbeat', { detail: { topGames: { [q.toolId || q.gameId || 'game']: 1 } }, _inc: true });
    return res.json({ kind: 'free', minutes: 1, freeRemaining: result.remainingFree, totalUsed: u.minutesUsed });
  }
  track('playPaid', { detail: { topGames: { [q.toolId || q.gameId || 'game']: 1 } }, _inc: true });
  return res.json({ kind: 'paid', minutes: 1, costCNY: result.costCNY, remainingFree: 0, totalUsed: u.minutesUsed });
}

// 接口：POST /api/pay/recharge - 充值包购买
// 预设方案：m10:10元/10分钟, m30:30元/30分钟, m100:100元/120分钟, y99:99元/永久, y299:299元/永久, y999:999元/永久
function handlePayRecharge(req, res) {
  const url = new URL(req.url, 'http://x');
  const q = Object.fromEntries(url.searchParams);
  const deviceId = q.deviceId || req.body.deviceId || 'anon';
  const plan = q.plan || req.body.plan; // 如 m10, m30, y99 等
  const plans = {
    m10: { minutes: 10, priceCNY: 10, desc: '10分钟补时￥10' },
    m30: { minutes: 30, priceCNY: 30, desc: '30分钟补时￥30' },
    y99: { minutes: -1, priceCNY: 99, desc: '永久会员￥99' }, // 永久标记
    y299: { minutes: -1, priceCNY: 299, desc: '永久会员￥299' },
    y999: { minutes: -1, priceCNY: 999, desc: '永久会员终身￥999' }
  };
  const p = plans[plan];
  if (!p) return badRequest(res, 'invalid plan');
  // 这里仅记录充值，真实支付请对接支付宝/微信/etc
  // 模拟充值成功：赋予对应分钟数（永久方案 minutes=-1 表示永久）
  const u = getPayUser(deviceId);
  if (p.minutes === -1) {
    // 永久会员：免费分钟无限制，计入 total minutes 但不扣费
    u.minutesUsed = Number.MAX_SAFE_INTEGER; // 标记永久
    track('recharge', { detail: { plans: { [plan]: 1 } }, amount: p.priceCNY });
    return res.json({ kind: 'recharge', plan, minutes: -1, priceCNY: p.priceCNY, status: 'permanent', message: '永久会员开通成功' });
  } else {
    u.minutesUsed += p.minutes;
    track('recharge', { detail: { plans: { [plan]: 1 } }, amount: p.priceCNY });
    return res.json({ kind: 'recharge', plan, minutes: p.minutes, priceCNY: p.priceCNY, status: 'added', remainingFree: u.freeMinutes });
  }
}

// 接口：POST /api/pay/invite - 邀请奖励
// 邀请人奖励：成功邀请 1 位好友，双方各得 10 分钟免费时长
function handlePayInvite(req, res) {
  const url = new URL(req.url, 'http://x');
  const q = Object.fromEntries(url.searchParams);
const deviceId = q.deviceId || 'anon';
      const inviterId = q.inviterId || undefined;
      const u = getPayUser(deviceId);
      track('invite');
  // 邀请对象免费 +10 分钟
  const resInvitee = addFreeMinutes(deviceId, 10);
  let freeMinutesInviter = 0;
  let inviterReason = 'no inviter';
  if (inviterId) {
    const inviter = getPayUser(inviterId);
    const resInviter = addFreeMinutes(inviterId, 10);
    freeMinutesInviter = resInviter.added;
    inviterReason = 'ok';
  }
  return res.json({
    invitee: { deviceId, freeMinutesAdded: resInvitee.added, freeRemaining: u.freeMinutes },
    inviter: { freeMinutesAdded: freeMinutesInviter, reason: inviterReason }
  });
}

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

function toolPrice(toolId, data, type) {
  const t = data.tools.find(x => x.id === toolId);
  if (!t) return 0;
  return type === 'lifetime' ? t.pricing.lifetime : t.pricing.monthly;
}

// 授权开通（支付确认/query 共用）：计入 license、计提 5% 推广费、返佣给邀请人
function grantAccess(deviceId, toolId, type, { source = 'pay', tools = [] } = {}) {
  const u = findUser(deviceId);
  const t = tools.find(x => x.id === toolId);
  if (!t) return { ok: false, error: '工具不存在' };
  if (u.tools[toolId]) return { ok: true, already: true, license: u.tools[toolId] };
  u.tools[toolId] = type === 'lifetime' ? 'lifetime' : 'subscription';
  track('payConfirm', { amount: type === 'lifetime' ? t.pricing.lifetime : t.pricing.monthly, source });
  // 收入计提 5% 进推广费基金（自主投放预算）
  try {
    const { accrue } = require('../promo/fund');
    accrue(type === 'lifetime' ? t.pricing.lifetime : t.pricing.monthly, { ref: deviceId + '/' + toolId });
  } catch (e) { /* fund 未配置时忽略 */ }

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
      track('referralBonus', { amount: paid * ratio });
      u._bonusGiven = true;
      if (inviter.verifiedFriends >= 10) inviter.freePermanent = true;
    }
  }
  return { ok: true, license: u.tools[toolId] };
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

  // GET /api/feedback 反馈列表（管理用）
  if (p[0] === 'feedback' && p.length === 1 && req.method === 'GET') {
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

  // GET /api/pay/balance - 查询用户分钟余额
  if (p[0] === 'pay' && p[1] === 'balance') {
    return handlePayBalance(req, res);
  }

  // POST /api/pay/heartbeat - 心跳扣费
  if (p[0] === 'pay' && p[1] === 'heartbeat' && req.method === 'POST') {
    return handlePayHeartbeat(req, res);
  }

  // POST /api/pay/recharge - 充值包购买
  if (p[0] === 'pay' && p[1] === 'recharge' && req.method === 'POST') {
    return handlePayRecharge(req, res);
  }

  // POST /api/pay/invite - 邀请奖励
  if (p[0] === 'pay' && p[1] === 'invite' && req.method === 'POST') {
    return handlePayInvite(req, res);
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
      const u = findUser(body.deviceId);
      if (body.referredBy && !u.referredBy) u.referredBy = body.referredBy;
      track('user');
      return json(res, { success: true, user: { deviceId: u.deviceId, referralCode: u.referralCode, verifiedFriends: u.verifiedFriends, referredBy: u.referredBy } });
    }

    // POST /api/check
    if (p[0] === 'check') {
      if (!body.toolId) return badRequest(res, '需要 toolId');
      const tool = tools.find(t => t.id === body.toolId);
      if (!tool) return notFound(res, '工具不存在');
      track('check');
      return json(res, checkOne(body.deviceId || 'anon', body.toolId, tool, data));
    }

    // POST /api/use
    if (p[0] === 'use') {
      if (!body.toolId) return badRequest(res, '需要 toolId');
      const u = findUser(body.deviceId || 'anon');
      if (!u.usage[body.toolId]) u.usage[body.toolId] = 0;
      u.usage[body.toolId]++;
      track('use', { detail: { topTools: { [body.toolId]: 1 } } });
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
      track('payOrder');

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

    // POST /api/pay/confirm 确认支付 -> 开通许可 + 返佣（demo/回调直付用）
    if (p[0] === 'pay' && p[1] === 'confirm') {
      const { deviceId, toolId, type } = body;
      if (!deviceId || !toolId) return badRequest(res, '需要 deviceId/toolId');
      const g = grantAccess(deviceId, toolId, type, { source: 'confirm', tools });
      if (!g.ok) return notFound(res, g.error);
      return json(res, { success: true, status: 'paid', license: g.license, message: '支付成功已开通' });
    }

    // POST /api/pay/query 主动核验订单（支付宝返回收银台后调用）-> 已支付则立即开通
    if (p[0] === 'pay' && p[1] === 'query') {
      const { deviceId, toolId, type, orderId } = body;
      if (!deviceId || !toolId || !orderId) return badRequest(res, '需要 deviceId/toolId/orderId');
      const u = findUser(deviceId);
      if (u.tools[toolId]) return json(res, { success: true, paid: true, already: true, license: u.tools[toolId] });
      let alipay = null;
      try { alipay = require('./alipay'); } catch (e) { alipay = null; }
      if (!alipay || !alipay.ready()) return json(res, { success: true, paid: false, reason: 'alipay-unavailable' });
      let q = null;
      try { q = await alipay.queryTrade(orderId); } catch (e) { q = { ok: false, error: e.message }; }
      const status = q && q.status;
      if (q && q.ok && (status === 'TRADE_SUCCESS' || status === 'TRADE_FINISHED')) {
        const g = grantAccess(deviceId, toolId, type || 'subscription', { source: 'query', tools });
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
module.exports.payUsers = payUsers;