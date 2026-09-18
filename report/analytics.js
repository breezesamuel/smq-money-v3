// report/analytics.js - 业务埋点聚合（内存态，供周报脚本读取）
// 生产持久化待接 Supabase/KV；同一冷启动内各事件统计可用
// track(name, meta):
//   meta.detail   -> { counterKey: { subKey: inc }, ... } 累加；如 { topGames: { g204: 1 } }
//   meta.amount   -> number，计入 events[name]Amount 累计（如充值金额、返佣）
const events = {
  user: 0,            // 注册/识别用户
  use: 0,             // 工具使用次数
  check: 0,           // 配额检查
  playHeartbeat: 0,   // 街机心跳（免费）
  playPaid: 0,        // 街机心跳（付费）
  recharge: 0,        // 充值次数
  invite: 0,          // 邀请次数
  payOrder: 0,        // 发起支付
  payConfirm: 0,      // 支付成功
  promoGenerated: 0,  // 推广帖生成
  promoDispatched: 0, // 推广帖分发
  promoClick: 0       // 推广点击
};

const amounts = {
  recharge: 0,
  referralBonus: 0
};

const detail = {
  payUsersCount: 0,
  memoUsersCount: 0,
  topTools: {},       // toolId -> uses
  topGames: {},       // gameId -> plays
  plans: {},          // plan -> count
  providers: {},      // model -> count
  clickByPost: {}     // postId -> clicks
};

function incCounter(map, key, n) {
  if (key == null) return;
  map[key] = (map[key] || 0) + (Number(n) || 1);
}

function track(name, meta = {}) {
  const isEvent = events[name] !== undefined;
  if (!isEvent && amounts[name] === undefined) return;
  if (isEvent) events[name]++;
  if (meta.amount) {
    const key = name + 'Amount';
    if (amounts[key] !== undefined) amounts[key] += Number(meta.amount) || 0;
    else if (amounts[name] !== undefined) amounts[name] += Number(meta.amount) || 0;
  }
  if (meta.detail) {
    for (const [mapKey, entries] of Object.entries(meta.detail)) {
      const target = detail[mapKey];
      if (!target || typeof target !== 'object') continue;
      if (typeof entries === 'object' && entries !== null) {
        for (const [k, v] of Object.entries(entries)) incCounter(target, k, v);
      } else {
        incCounter(target, entries, 1);
      }
    }
  }
}

function snapshot(external = {}) {
  const snap = {
    events: { ...events }, detail: JSON.parse(JSON.stringify(detail)),
    amounts: { ...amounts }, capturedAt: new Date().toISOString()
  };
  if (external && typeof external === 'object') snap.external = external;
  return snap;
}

function reset() {
  Object.keys(events).forEach(k => events[k] = 0);
  Object.keys(amounts).forEach(k => amounts[k] = 0);
  detail.payUsersCount = 0;
  detail.memoUsersCount = 0;
  detail.topTools = {};
  detail.topGames = {};
  detail.plans = {};
  detail.providers = {};
  detail.clickByPost = {};
}

module.exports = { track, snapshot, reset, events, amounts, detail };