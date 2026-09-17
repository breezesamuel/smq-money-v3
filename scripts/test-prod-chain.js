const http = require('http');
const fs = require('fs');
const path = require('path');
const apiHandler = require('../api/index');

const DIST = path.join(__dirname, '..', 'frontend', 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url.startsWith('/api/')) {
    const expressRes = {
      status: c => { res.statusCode = c; return expressRes; },
      setHeader: (k, v) => res.setHeader(k, v),
      json: o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); },
      send: s => res.end(s)
    };
    return apiHandler(req, expressRes, () => {});
  }
  // 静态文件
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(DIST, p);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
    return res.end(fs.readFileSync(f));
  }
  res.statusCode = 404; res.end('not found');
});

server.listen(8891, async () => {
  const get = (url) => new Promise((resolve) => {
    http.get('http://127.0.0.1:8891' + url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve({ status: r.statusCode, body: d })); });
  });
  const post = (url, body) => new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request({ host: '127.0.0.1', port: 8891, path: url, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve({ status: r.statusCode, body: d })); });
    req.write(data); req.end();
  });

  console.log('=== 全站生产模拟测试 ===\n');
  const page = await get('/');
  console.log(`[${page.status}] 首页: ${page.body.includes('<div id="root">') ? '含 root ✓' : '异常'}`);
  const js = await get('/assets/' + (page.body.match(/assets\/(index-[\w-]+\.js)/) || [])[1]);
  console.log(`[${js.status}] 主 JS: ${js.body.length} bytes ✓`);

  const dev = await get('/api/tools?lang=zh&per=3');
  const tools = JSON.parse(dev.body);
  console.log(`[${dev.status}] /api/tools: total=${tools.stats.total} / 返回${tools.tools.length} ✓`);

  const d = await get(`/api/tools/${tools.tools[0].id}`);
  const detail = JSON.parse(d.body);
  console.log(`[${d.status}] 详情: ${detail.name.title} ✓`);

  const u = await post('/api/user', { deviceId: 'e2e-device' });
  const user = JSON.parse(u.body);
  console.log(`[${u.status}] 用户: ${user.user.referralCode} ✓`);

  console.log('\n✅ 生产链全部 OK');
  server.close(); process.exit(0);
});