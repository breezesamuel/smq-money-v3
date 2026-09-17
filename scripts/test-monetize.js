const http = require('http');
const { MonetizeEngine } = require('../monetize/monetize-engine');

process.env.PORT = '3123';
const app = require('../monetize-server.js');

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port: 3123, path, method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const checks = [];
  const health = await api('GET', '/api/v1/health');
  checks.push(['health', health.status, health.body.includes('"status":"ok"')]);

  const gen = await api('POST', '/api/v1/product/generate', { type: 'ai_tool', name: '合同助手Pro' });
  let prodId = null;
  try { prodId = JSON.parse(gen.body).product.id; } catch (e) {}
  checks.push(['generate', gen.status, !!prodId && gen.body.includes('fileCount')]);

  const start = await api('POST', '/api/v1/engine/start', {});
  checks.push(['engine-start', start.status, start.body.includes('running')]);

  const pub = await api('POST', '/api/v1/publish', { productId: prodId });
  let listingId = null;
  try { listingId = JSON.parse(pub.body).listing.id; } catch (e) {}
  checks.push(['publish', pub.status, !!listingId && pub.body.includes('published')]);

  const sim = await api('POST', '/api/v1/simulate/sale', { listingId });
  checks.push(['simulate-sale', sim.status, sim.body.includes('"success":true')]);

  const dash = await api('GET', '/api/v1/dashboard');
  checks.push(['dashboard', dash.status, dash.body.includes('watchdog')]);

  const stop = await api('POST', '/api/v1/engine/stop', {});
  checks.push(['engine-stop', stop.status, stop.body.includes('stopped')]);

  const brain = await api('POST', '/api/v1/ai/brain/think', { prompt: '测试' });
  checks.push(['ai-brain', brain.status, brain.body.includes('success')]);

  let allPass = true;
  checks.forEach(([name, status, ok]) => {
    console.log(`${ok ? '✅' : '❌'} ${name.padEnd(16)} HTTP ${status} ${ok ? 'PASS' : 'FAIL'}`);
    if (!ok) allPass = false;
  });
  console.log(allPass ? '\n🎯 全部 API 测试通过 — 全托管运营赚钱系统已可用' : '\n⚠️ 存在失败项');
  process.exit(allPass ? 0 : 1);
})();