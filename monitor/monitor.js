// monitor/monitor.js - 24h 全项目健康监控
// 检查一组 URL 目标，判定异常(非200/超时/内容缺失/JSON error)，返回 alerts
// 报警去向: 1) 邮件(SMTP 配置就绪时) 2) monitor-alerts.json 落盘队列 3) 输出可被 cron 消费
const fs = require('fs');
const path = require('path');

const ALERTS_FILE = path.join(__dirname, 'alerts', 'monitor-alerts.json');
const LAST_FILE = path.join(__dirname, 'alerts', 'monitor-last.json');

// 默认目标：生产站点核心端点
function defaultTargets() {
  const base = process.env.MONITOR_BASE_URL || 'https://smq-v3.vercel.app';
  return [
    { name: 'health', url: base + '/api/health', expect: { status: 200, json: { status: 'ok' } } },
    { name: 'tools', url: base + '/api/tools?per=1', expect: { status: 200, json: { total: (v) => Number(v) > 100 } } },
    { name: 'promo', url: base + '/api/promo/status', expect: { status: 200, json: { success: true } } },
    { name: 'sitemap', url: base + '/sitemap.xml', expect: { status: 200, body: (v) => /<url>/.test(v) } },
    { name: 'robots', url: base + '/robots.txt', expect: { status: 200, body: (v) => /Sitemap/.test(v) } },
    { name: 'arcade_index', url: base + '/arcade/', expect: { status: 200, body: (v) => /游戏/.test(v) || /game/.test(v) || /Play/.test(v) } },
    { name: 'admin_promo', url: base + '/admin/promo', expect: { status: 200, body: (v) => /Okara/i.test(v) } },
    { name: 'rss', url: base + '/rss.xml', expect: { status: 200, body: (v) => /<rss|<feed/i.test(v) } }
  ];
}

// 从 env 覆盖目标: MONITOR_TARGETS = "name1|url1|expect1;name2|url2|expect2" (expect 为 status)
function envTargets() {
  const raw = process.env.MONITOR_TARGETS;
  if (!raw) return null;
  return raw.split(';').filter(Boolean).map(seg => {
    const [name, url, expect] = seg.split('|');
    return { name: name || url, url, expect: expect ? { status: Number(expect) } : {} };
  });
}

async function checkOne(t, timeoutMs = 10000) {
  const url = t.url;
  const start = Date.now();
  const ctl = AbortSignal.timeout(timeoutMs);
  const res = { name: t.name, url, ok: false, status: null, ms: 0, problems: [], checkedAt: new Date().toISOString() };
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl, headers: { 'User-Agent': 'smq-monitor/1.0' } });
    res.ms = Date.now() - start;
    res.status = r.status;
    const text = await r.text();
    const exp = t.expect || {};
    if (exp.status !== undefined && r.status !== exp.status) res.problems.push('status ' + r.status + ' != ' + exp.status);
    if (exp.json) {
      let j = null;
      try { j = JSON.parse(text); } catch (e) { res.problems.push('非 JSON 响应'); }
      if (j) {
        for (const [k, v] of Object.entries(exp.json)) {
          if (typeof v === 'function') { if (!v(j[k])) res.problems.push('json.' + k + ' 校验失败'); }
          else if (j[k] !== v) res.problems.push('json.' + k + '=' + j[k] + ' != ' + v);
        }
      }
    }
    if (exp.body) {
      for (const [k, v] of Object.entries(exp.body)) {
        if (typeof v === 'function') { if (!v(text)) res.problems.push('body.' + k + ' 内容缺失'); }
      }
    }
    res.ok = res.problems.length === 0;
  } catch (e) {
    res.ms = Date.now() - start;
    res.ok = false;
    res.problems.push(e.name === 'TimeoutError' || /timeout/i.test(e.message) ? '超时(>' + timeoutMs + 'ms)' : e.message);
  }
  return res;
}

function loadAlerts() {
  try { return JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8')); }
  catch (e) { return { since: new Date().toISOString(), alerts: [] }; }
}

function saveAlerts(d) {
  try { fs.mkdirSync(path.dirname(ALERTS_FILE), { recursive: true }); } catch (e) {}
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(d, null, 2), 'utf8');
}

function saveLast(last) {
  try { fs.mkdirSync(path.dirname(LAST_FILE), { recursive: true }); } catch (e) {}
  fs.writeFileSync(LAST_FILE, JSON.stringify(last, null, 2), 'utf8');
}

async function run(opts = {}) {
  const targets = opts.targets || envTargets() || defaultTargets();
  const results = await Promise.all(targets.map(t => checkOne(t, opts.timeoutMs || 10000)));
  const failed = results.filter(r => !r.ok);
  const summary = { checkedAt: new Date().toISOString(), total: results.length, ok: results.filter(r => r.ok).length, failed: failed.length, results };
  saveLast(summary);

  const alerts = loadAlerts();
  const now = Date.now();
  // 去重窗口：同一 name 20 分钟内不再重复告警
  alerts.alerts = alerts.alerts.filter(a => now - new Date(a.at).getTime() < 20 * 60 * 1000);
  const already = new Set(alerts.alerts.map(a => a.name + '@' + a.url));
  for (const f of failed) {
    if (f.problems.some(p => /timeout|ENOTFOUND|ECONNREFUSED|ECONNRESET/i.test(p))) {
      // 网络层失败可能是本机出口被封，生产归属由外部 runner 双判；本地只记一次
    }
    const key = f.name + '@' + f.url;
    if (already.has(key)) continue;
    alerts.alerts.push({ name: f.name, url: f.url, at: new Date().toISOString(), status: f.status, ms: f.ms, problems: f.problems });
    saveAlerts(alerts);
  }
  return { summary, alerts: alerts.alerts };
}

async function notifyAlerts(opts = {}) {
  const { summary, alerts } = await run(opts);
  const recipients = (opts.recipients || process.env.MONITOR_EMAILS || '').split(',').filter(Boolean);
  if (!alerts.length) return { sent: false, alerts: 0, message: 'all ok' };
  const text = alerts.map(a =>
    `🔴 ${a.name} (${a.url})\n   状态: ${a.status} | 耗时: ${a.ms}ms\n   问题: ${a.problems.join('; ')}\n   时间: ${a.at}`
  ).join('\n\n');
  const html = alerts.map(a =>
    `<li><b>${a.name}</b> <code>${a.url}</code><br>状态 ${a.status} · ${a.ms}ms<br><font color="#c00">${a.problems.join('; ')}</font><br><small>${a.at}</small></li>`
  ).join('');

  if (!recipients.length) return { sent: false, alerts: alerts.length, message: 'no recipients configured' };

  let emailResult = null;
  try {
    const { sendMail } = require('../modules/smtp');
    emailResult = await sendMail({
      to: recipients,
      subject: '[SMQ 监控] ' + alerts.length + ' 项异常 - ' + new Date().toISOString().slice(0, 16),
      text,
      html: '<p>监控到 <b>' + alerts.length + '</b> 项异常（' + new Date().toLocaleString('zh-CN') + '）：</p><ul>' + html + '</ul>'
    });
    // 发送成功后清空队列
    saveAlerts({ since: new Date().toISOString(), alerts: [] });
  } catch (e) {
    return { sent: false, emailError: e.message, alerts: alerts.length, message: 'email failed' };
  }
  return { sent: true, emailResult, alerts: alerts.length, message: 'sent' };
}

module.exports = { run, notifyAlerts, checkOne, defaultTargets, ALERTS_FILE, LAST_FILE };