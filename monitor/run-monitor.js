// monitor/run-monitor.js - 监控 CLI（无人值守）
// 用法: node monitor/run-monitor.js [--notify] [--base https://...]
// 环境变量: MONITOR_BASE_URL / MONITOR_EMAILS / SMTP_HOST / SMTP_USER / SMTP_PASS
require('../lib/env').ensureEnv('.env');
const { run, notifyAlerts } = require('./monitor');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

(async () => {
  const base = arg('base', process.env.MONITOR_BASE_URL);
  const opts = { base };
  const doNotify = process.argv.includes('--notify');
  const before = Date.now();
  if (doNotify) {
    const r = await notifyAlerts(opts);
    console.log(JSON.stringify({ mode: 'notify', ...r, elapsedMs: Date.now() - before }, null, 1));
  } else {
    const { summary } = await run(opts);
    console.log(JSON.stringify(summary, null, 1));
  }
  process.exit(0);
})().catch(e => { console.error('MONITOR ERROR:', e.message); process.exit(1); });