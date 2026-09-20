// scripts/verify/serve-local.js
// 本地生产模拟：serve dist + api handler，输出首页/工具/arcade 关键 HTML 抽样
// 用法：node scripts/verify/serve-local.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const api = require(path.join(ROOT, 'api/index.js'));
const DIST = path.join(ROOT, 'frontend/dist');
const ARC = path.join(ROOT, 'frontend/public');

http.createServer(async (req, res) => {
  const url = req.url;
  if (url.startsWith('/api/')) {
    const body = [];
    try { for await (const c of req) body.push(c); } catch (e) {}
    req.body = Buffer.concat(body).length ? ((() => { try { return JSON.parse(Buffer.concat(body).toString()); } catch (e) { return {}; } })()) : {};
    req.query = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    req.hostname = 'localhost';
    req.baseUrl = '';
    const echo = {
      statusCode: 200, headers: {}, _sent: false, _body: '',
      status(c) { this.statusCode = c; return this; },
      setHeader(k, v) { this.headers[k] = v; return this; },
      type() { return this; },
      json(o) { this._sent = true; this._body = JSON.stringify(o); this._end(); },
      send(o) { this._sent = true; this._body = typeof o === 'object' ? JSON.stringify(o) : String(o); this._end(); },
      end(o) { this._sent = true; if (o !== undefined) this._body = o; this._end(); },
      write(o) { this._body += o; },
      _end: null,
    };
    await new Promise(r => { echo._end = r; api(req, echo).catch(() => r()); });
    res.statusCode = echo.statusCode || 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(echo._body);
    return;
  }
  let f = url === '/' ? '/index.html' : url.split('?')[0];
  let base = DIST;
  if (f.startsWith('/arcade/')) base = ARC;
  let fp = path.join(base, f);
  if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html');
  if (!fs.existsSync(fp)) { res.statusCode = 404; res.end('404'); return; }
  const ext = path.extname(fp);
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };
  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  res.end(fs.readFileSync(fp));
}).listen(3458, async () => {
  console.log('listening 3458');
  const get = p => new Promise(res => http.get('http://127.0.0.1:3458' + p, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => res({ status: r.statusCode, body: b, len: b.length })); }).on('error', e => res({ status: 0, err: e.message })));
  let fail = 0;
  const check = (name, ok, detail) => { console.log((ok ? '  ok ' : '  XX '), name, detail || ''); if (!ok) fail++; };

  const home = await get('/');
  console.log('\n=== 首页 ===');
  check('http 200', home.status === 200, 'status=' + home.status);
  const m = home.body.match(/<title>(.*?)<\/title>/);
  const m2 = home.body.match(/<meta name="description" content="([^"]*)"/);
  check('title', !!m, m && m[1]);
  check('desc', !!m2, m2 && m2[1]);
  check('no stale 300+', !/300\+ 小工具/.test(home.body));
  check('no stale 前10分钟', !/前10分钟免费/.test(home.body));
  check('has brand 528+', /528\+ 在线/.test(home.body));
  check('has #root', home.body.includes('id="root"'));

  const arc = await get('/arcade/');
  console.log('\n=== arcade ===');
  check('http 200', arc.status === 200, 'status=' + arc.status);
  const a1 = arc.body.match(/<title>(.*?)<\/title>/);
  check('title', !!a1, a1 && a1[1]);
  check('toplinks', arc.body.includes('id="toplinks"'));
  check('no stale 前10分钟计费', !/前10分钟.*¥0\.2/.test(arc.body));

  const rss = await get('/api/rss.xml');
  console.log('\n=== /api/rss.xml ===');
  check('200 + rss', /<rss|<feed/i.test(rss.body), rss.len + 'b');
  check('no stale 300+', !/300\+ 在线/.test(rss.body));
  check('no stale 前10分钟', !/前10分钟免费/.test(rss.body));

  const apiH = await get('/api/health');
  const hj = JSON.parse(apiH.body || '{}');
  check('/api/health', apiH.status === 200 && hj.tools >= 520, 'tools=' + hj.tools);

  const apiT = await get('/api/tools?lang=zh&per=600');
  const tj = JSON.parse(apiT.body || '{}');
  check('/api/tools', Array.isArray(tj.tools) && tj.tools.length >= 520, 'count=' + (tj.tools && tj.tools.length));

  // 第七批工具可达性
  const slug = await get('/api/tools?lang=zh&per=626&q=baby-sleep');
  const sj = JSON.parse(slug.body || '{}');
  const found = sj.tools && sj.tools.some(x => x.slug.includes('baby-sleep-tracker'));
  check('第七批工具可达(搜索)', found, 'q=baby-sleep');

  console.log('\n' + (fail === 0 ? '✅ 本地生产模拟全部通过' : '❌ ' + fail + ' 项未通过'));
  process.exit(fail === 0 ? 0 : 1);
});