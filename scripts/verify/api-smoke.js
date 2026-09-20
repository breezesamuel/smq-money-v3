// scripts/verify/api-smoke.js
// API 函数级冒烟测试：直接调 api/index.js handler（mock req/res），验证核心端点
// 用法：node scripts/verify/api-smoke.js
const { EventEmitter } = require('events');
const api = require('../../api/index.js');

function call(req) {
  return new Promise((resolve) => {
    let sent = false;
    const res = {
      statusCode: 0,
      headers: {},
      status(c) { this.statusCode = c; return this; },
      setHeader(k, v) { this.headers[k] = v; return this; },
      type() { return this; },
      bodyOut: '',
      send(b) {
        if (sent) return; sent = true;
        if (typeof b === 'object') b = JSON.stringify(b);
        this.bodyOut = b;
        resolve(this);
      },
      json(b) { this.send(b); },
      end(b) { if (sent) return; sent = true; if (b !== undefined) this.bodyOut += b; resolve(this); },
      write(b) { this.bodyOut += b; },
    };
    // mock 可流式 req
    const stream = new EventEmitter();
    req = Object.assign(stream, {
      method: 'GET',
      url: '/api/' + (req.path || ''),
      headers: {},
      query: {},
      body: {},
      destroy() { },
    }, req);
    // 若有请求体，异步按流发出
    let timer = setTimeout(() => { if (!sent) { sent = true; res.statusCode = 599; res.bodyOut = 'TIMEOUT'; resolve(res); } }, 5000);
    const origOn = stream.on.bind(stream);
    stream.on = function (ev, cb) {
      origOn(ev, cb);
      if (ev === 'end' && stream.__body !== undefined && stream.__body !== null) {
        setTimeout(() => { stream.emit('data', Buffer.from(stream.__body, 'utf8')); stream.emit('end'); }, 5);
      }
      return stream;
    };
    let bodyPayload = typeof req.body === 'string' ? req.body : (req.body && typeof req.body === 'object' && Object.keys(req.body).length ? JSON.stringify(req.body) : undefined);
    delete req.body;
    stream.__body = bodyPayload;
    try {
      const p = api(req, res);
      if (p && p.catch) p.catch(e => { if (!sent) { sent = true; clearTimeout(timer); res.statusCode = 500; res.bodyOut = 'ERR ' + e.message; resolve(res); } });
    } catch (e) {
      if (!sent) { sent = true; clearTimeout(timer); res.statusCode = 500; res.bodyOut = 'THROW ' + e.message; resolve(res); }
    }
    if (!sent && !stream.__body) { clearTimeout(timer); timer = setTimeout(() => { if (!sent) { sent = true; res.statusCode = 599; res.bodyOut = 'TIMEOUT'; resolve(res); } }, 5000); }
  });
}

function jparse(raw) { try { return JSON.parse(raw); } catch (e) { return null; } }

(async () => {
  const results = [];
  const r1 = await call({ path: 'health' });
  const j1 = jparse(r1.bodyOut);
  results.push(['GET /api/health (tools>=520)', r1.statusCode === 200 && j1 && j1.tools >= 520, 'tools=' + (j1 && j1.tools)]);

  const r2 = await call({ path: 'tools?lang=zh&per=600' });
  const j2 = jparse(r2.bodyOut);
  results.push(['GET /api/tools (全量 >=500)', r2.statusCode === 200 && Array.isArray(j2.tools) && j2.tools.length >= 500, 'count=' + (j2.tools && j2.tools.length)]);

  const r3 = await call({ path: 'pricing' });
  const j3 = jparse(r3.bodyOut);
  results.push(['GET /api/pricing (zh.monthly=60)', r3.statusCode === 200 && j3.plans && j3.plans.zh && j3.plans.zh.monthly === 60, 'monthly=' + (j3.plans && j3.plans.zh && j3.plans.zh.monthly)]);

  const r4 = await call({ path: 'tools/l1001?lang=zh' });
  const j4 = jparse(r4.bodyOut);
  results.push(['GET /api/tools/:id (tip-calculator)', r4.statusCode === 200 && j4.slug === 'tip-calculator', 'slug=' + j4.slug]);

  const r5 = await call({ path: 'sitemap.xml' });
  results.push(['GET /api/sitemap.xml', r5.bodyOut.includes('<urlset'), 'xml=' + r5.bodyOut.length + 'b']);

  const r6 = await call({ path: 'rss.xml' });
  results.push(['GET /api/rss.xml', /<rss|<feed/i.test(r6.bodyOut), 'rss=' + r6.bodyOut.length + 'b']);

  const r7 = await call({ path: 'robots.txt' });
  results.push(['GET /api/robots.txt', r7.bodyOut.includes('Sitemap'), 'len=' + r7.bodyOut.length]);

  const r8 = await call({ path: 'user', method: 'POST', body: JSON.stringify({ deviceId: 'smoke-test-' + Date.now() }) });
  const j8 = jparse(r8.bodyOut);
  results.push(['POST /api/user (referralCode)', r8.statusCode === 200 && j8.user && j8.user.referralCode && j8.user.referralCode.length >= 6, 'code=' + (j8.user && j8.user.referralCode)]);

  const r9 = await call({ path: 'tools/does-not-exist-xyz' });
  results.push(['GET unknown tool (404)', r9.statusCode === 404, 'status=' + r9.statusCode]);

  let pass = 0;
  for (const [n, ok, info] of results) { console.log((ok ? 'PASS' : 'FAIL'), n, info); if (ok) pass++; }
  console.log(`== ${pass}/${results.length} PASS`);
  process.exit(pass === results.length ? 0 : 1);
})();