// report/daily.js - 每日运营台账采集（持久化到 report/daily-ledger.json）
// 本地 cron / GH Actions 每次 run-daily 后调用，产出可跨进程聚合的运营历史
const fs = require('fs');
const path = require('path');

const LEDGER_FILE = path.join(__dirname, 'daily-ledger.json');

function load() {
  try { return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8')); }
  catch (e) { return {}; }
}

function save(ledger) {
  try { fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2), 'utf8'); return true; }
  catch (e) { return false; }
}

// 采集当日快照并写入台账（按 UTC 日期聚合，同日多次运行取最新）
function captureDay(extra = {}) {
  const ledger = load();
  const today = new Date().toISOString().slice(0, 10);
  const sessions = ledger._sessions || (ledger._sessions = {});
  const session = sessions[today] || (sessions[today] = []);

  const promo = (() => {
    try {
      const store = require('../promo/store');
      const C = {};
      C.stats = store.get('stats') || {};
      C.campaigns = (store.get('feed') || []).length;
      C.published = (store.get('published') || []).length;
      const plats = {};
      for (const c of (store.get('feed') || [])) for (const p of (c.posts || [])) plats[p.platform] = (plats[p.platform] || 0) + 1;
      C.byPlatform = plats;
      const clicks = store.get('clicks') || {};
      C.topClicked = Object.entries(clicks).sort((a, b) => b[1] - a[1]).slice(0, 5);
      return C;
    } catch (e) { return { error: e.message }; }
  })();

  const analytics = (() => {
    try { return require('./analytics').snapshot(); }
    catch (e) { return { error: e.message }; }
  })();

  const entry = {
    ts: new Date().toISOString(),
    date: today,
    promo,
    analytics: { events: analytics.events, amounts: analytics.amounts, detail: analytics.detail }, // 快照副本
    extra
  };
  session.push(entry);
  // 同日仅保留最后一条，避免膨胀
  sessions[today] = [entry];
  save(ledger);
  return entry;
}

// 读取最近 N 天台账（含 sessions 平铺便于聚合）
function recentDays(n = 7) {
  const ledger = load();
  const sessions = ledger._sessions || {};
  const days = Object.keys(sessions).sort().slice(-n);
  return days.map(d => ({ date: d, sessions: sessions[d] || [] }));
}

module.exports = { captureDay, recentDays, LEDGER_FILE };