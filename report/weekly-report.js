// report/weekly-report.js - 周报生成器
// 数据源(按优先级): 1) report/daily-ledger.json 历史台账(持久, 跨进程可靠)
//                  2) 当前进程内 analytics/promo/计费内存态(dev 直跑时可见)
//                  3) promo-state.json(持久推广状态)
// 用法: node report/weekly-report.js [--json] [--days 7]
const fs = require('fs');
const path = require('path');

const analytics = require('./analytics');
const daily = require('./daily');

const ROOT = path.join(__dirname, '..');
const PROMO_STATE = path.join(ROOT, 'promo-state.json');

function loadPromoState() {
  try { return JSON.parse(fs.readFileSync(PROMO_STATE, 'utf8')); }
  catch (e) { return null; }
}

function sum(a) { return a.reduce((x, y) => x + (Number(y) || 0), 0); }

function daysArg() {
  const i = process.argv.indexOf('--days');
  const n = parseInt(i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : '7');
  return isNaN(n) ? 7 : n;
}

function mergeSums(rows) {
  const out = { events: {}, amounts: {}, plans: {}, providers: {}, topClicked: {}, byPlatform: {} };
  for (const r of rows) {
    const ev = r.analytics?.events || {};
    for (const [k, v] of Object.entries(ev)) out.events[k] = (out.events[k] || 0) + v;
    const am = r.analytics?.amounts || r.extra || {};
    for (const [k, v] of Object.entries(am)) {
      if (['recharge', 'referralBonus'].includes(k)) out.amounts[k] = (out.amounts[k] || 0) + (Number(v) || 0);
    }
    // 平台分布（台账 promo 快照）
    for (const [k, v] of Object.entries((r.promo || {}).byPlatform || {})) out.byPlatform[k] = (out.byPlatform[k] || 0) + v;
    // 点击：promo.topClicked 为 [[postId, clicks], ...]，analytics.clickByPost 为 {postId: clicks}
    for (const [k, v] of Object.entries((r.promo || {}).topClicked || {})) {
      if (Array.isArray(v)) out.topClicked[v[0]] = (out.topClicked[v[0]] || 0) + Number(v[1]);
      else out.topClicked[k] = (out.topClicked[k] || 0) + Number(v);
    }
    const cbp = r.analytics?.detail?.clickByPost || {};
    for (const [k, v] of Object.entries(cbp)) out.topClicked[k] = (out.topClicked[k] || 0) + Number(v);
  }
  return out;
}

function fmtMoney(n) {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}

function getThisWeekStart() {
  const d = new Date();
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function build() {
  const N = daysArg();
  const days = daily.recentDays(N);
  const ledger = mergeSums(days.reduce((a, d) => a.concat(d.sessions), []));
  const liveAnalytics = analytics.snapshot();

  // promo 持久态
  const state = loadPromoState();
  const promoStats = state?.stats || {};
  const campaigns = state?.feed?.length || 0;

  const lines = [];
  lines.push(`# 🤖 SMQ-V3 运营周报`);
  lines.push('');
  lines.push(`> 统计周期：近 ${N} 天 (台账 ${days.length} 天) · 生成：${liveAnalytics.capturedAt}`);
  lines.push('');
  lines.push('## 📊 大盘一览（台账聚合）');
  lines.push('');
  lines.push('| 指标 | 数值 |');
  lines.push('| --- | --- |');
  lines.push(`| 台账天数 | ${days.length} |`);
  lines.push(`| 注册/识别用户 | ${ledger.events.user ?? liveAnalytics.events.user} |`);
  lines.push(`| 工具使用次数 | ${ledger.events.use ?? liveAnalytics.events.use} |`);
  lines.push(`| 街机免费心跳 | ${ledger.events.playHeartbeat ?? liveAnalytics.events.playHeartbeat} |`);
  lines.push(`| 街机付费心跳 | ${ledger.events.playPaid ?? liveAnalytics.events.playPaid} |`);
  lines.push(`| 付费心跳折算(¥) | ${fmtMoney((ledger.events.playPaid ?? 0) * 0.2)} |`);
  lines.push(`| 充值笔数 | ${ledger.events.recharge ?? liveAnalytics.events.recharge} |`);
  lines.push(`| 充值金额(¥) | ${fmtMoney(ledger.amounts.recharge)} |`);
  lines.push(`| 发起支付/成功 | ${ledger.events.payOrder ?? liveAnalytics.events.payOrder} / ${ledger.events.payConfirm ?? liveAnalytics.events.payConfirm} |`);
  lines.push(`| 返佣支出(¥) | ${fmtMoney(ledger.amounts.referralBonus)} |`);
  lines.push('');
  lines.push('## 🎤 Okara 推广（promo-state 持久统计）');
  lines.push('');
  lines.push('| 指标 | 数值 |');
  lines.push('| --- | --- |');
  lines.push(`| Campaign | ${campaigns} |`);
  lines.push(`| 生成帖 | ${promoStats.generated ?? 0} |`);
  lines.push(`| 已分发 | ${promoStats.published ?? 0} |`);
  lines.push(`| 点击 | ${promoStats.clicks ?? 0} |`);
  lines.push(`| 转化 | ${promoStats.conversions ?? 0} |`);
  lines.push('');
  const plats = Object.entries(ledger.byPlatform);
  if (plats.length) {
    lines.push('**平台分布(台账)**');
    lines.push('');
    lines.push('| 平台 | 帖数 |');
    lines.push('| --- | --- |');
    for (const [k, v] of plats) lines.push(`| ${k} | ${v} |`);
    lines.push('');
  }
  const clicked = Object.entries(ledger.topClicked).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (clicked.length) {
    lines.push('**点击 TOP 5**');
    lines.push('');
    lines.push('| 帖 ID | 点击数 |');
    lines.push('| --- | --- |');
    for (const [k, v] of clicked) lines.push(`| ${k} | ${v} |`);
    lines.push('');
  }
  lines.push('## ⚠️ 备注');
  lines.push('');
  lines.push(`- 台账来源：本地 cron 每日 run-daily 落盘 ${path.relative(ROOT, daily.LEDGER_FILE)}${days.length ? '（运行中）' : '（暂无记录，需先跑一次 run-daily）'}`);
  lines.push('- 用户/计费/充值指标若为 0：生产 Serverless 无持久化，需接 Supabase 后统计真实业务数据');
  lines.push('- 付费心跳折算为理论收入（¥0.2/min），实际以支付网关到账为准');
  return lines.join('\n');
}

const md = build();
const outFile = path.join(ROOT, 'report', 'weekly-' + getThisWeekStart() + '.md');
fs.writeFileSync(outFile, md, 'utf8');

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(daily.recentDays(daysArg()), null, 1));
} else {
  console.log('周报已生成: ' + outFile);
  console.log(md);
}