const fs = require('fs');
const path = require('path');

const PRODUCT_TYPES = {
  website: {
    name: '网页应用',
    ext: 'html',
    description: '可直接静态部署的响应式网站'
  },
  app: {
    name: '移动应用',
    ext: 'html',
    description: 'PWA 移动应用，可安装到手机'
  },
  ai_tool: {
    name: 'AI 工具',
    ext: 'js',
    description: '接入多模型 API 的 AI 工具服务'
  },
  pain_tool: {
    name: '痛点工具',
    ext: 'html',
    description: '一键解决特定痛点的单页工具'
  },
  mini_program: {
    name: '微信小程序',
    ext: 'json',
    description: '可上传微信平台的完整小程序'
  },
  mini_game: {
    name: '小游戏',
    ext: 'html',
    description: 'HTM5 即时可玩小游戏'
  },
  desktop_ai: {
    name: '桌面 AI',
    ext: 'js',
    description: '本地桌面 AI 助手（Node 服务）'
  }
};

class ProductFactory {
  constructor(outputDir) {
    this.outputDir = outputDir || path.join(process.env.PRODUCT_DIR || __dirname, 'generated');
    this.products = new Map();
    this.trends = {
      website: ['落地页生成器', '在线简历站', '作品集展示器'],
      app: ['倒计时专注器', '记账本PWA', '习惯打卡应用'],
      ai_tool: ['文案改写器', '简历优化器', '代码解释器', '合同审查助手'],
      pain_tool: ['图片压缩器', '去背景神器', '格式转换器', '噪音消除器'],
      mini_program: ['点餐助手', '排队取号', '拼团工具'],
      mini_game: ['贪吃蛇', '2048', '打砖块', '记忆翻牌'],
      desktop_ai: ['本地问答助手', '会议纪要AI', '桌面翻译官']
    };
    this.fs = {
      saveProduct: (type, name, files) => this.saveProduct(type, name, files)
    };
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  getSupportedTypes() {
    return Object.entries(PRODUCT_TYPES).map(([type, meta]) => ({ key: type, ...meta }));
  }

  generate(idea = {}) {
    const type = idea.type || this.pickRandomType();
    if (!PRODUCT_TYPES[type]) throw new Error('不支持的产品类型: ' + type);
    const name = this.sanitizeName(idea.name || this.pickName(type));
    const id = this.makeId();
    const files = this.buildFiles(type, { name, theme: idea.theme || 'default', keywords: idea.keywords || [] });

    const product = {
      id,
      type,
      name,
      description: PRODUCT_TYPES[type].description,
      files,
      createdAt: new Date().toISOString(),
      status: 'draft',
      idea: idea.idea || ''
    };

    this.products.set(id, product);
    this.saveToDisk(product);
    return product;
  }

  saveToDisk(product) {
    const dir = path.join(this.outputDir, `${product.type}-${product.id}`);
    try {
      fs.mkdirSync(dir, { recursive: true });
      Object.entries(product.files).forEach(([file, content]) => {
        const filePath = path.join(dir, file);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content);
      });
      fs.writeFileSync(path.join(dir, 'product.json'), JSON.stringify(product, null, 2));
      product.savedDir = dir;
    } catch (e) {
      console.error('保存失败:', e.message);
      product.savedDir = null;
    }
  }

  buildFiles(type, { name, theme = 'default', keywords = [] }) {
    switch (type) {
      case 'website': return this.buildWebsite(name, theme);
      case 'app': return this.buildApp(name, theme);
      case 'ai_tool': return this.buildAITool(name);
      case 'pain_tool': return this.buildPainTool(name);
      case 'mini_program': return this.buildMiniProgram(name);
      case 'mini_game': return this.buildMiniGame(name);
      case 'desktop_ai': return this.buildDesktopAI(name);
      default: return {};
    }
  }

  buildWebsite(name, theme) {
    return {
      'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name}</title>
<meta name="description" content="${name} - 便捷高效的管理工具">
<style>
:root { --primary: ${this.themeColor(theme)}; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:system-ui,sans-serif; background:#0f172a; color:#e2e8f0; min-height:100vh; }
.hero { text-align:center; padding:80px 20px; background:linear-gradient(135deg,var(--primary),#0f172a); }
.hero h1 { font-size:3rem; margin-bottom:16px; }
.hero p { font-size:1.2rem; opacity:.9; }
.btn { display:inline-block; margin-top:24px; padding:12px 32px; background:var(--primary); color:#fff; border-radius:8px; text-decoration:none; font-weight:600; }
.features { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:20px; padding:60px 20px; max-width:960px; margin:0 auto; }
.card { background:#1e293b; padding:24px; border-radius:12px; border:1px solid #334155; }
.card h3 { color:var(--primary); margin-bottom:8px; }
footer { text-align:center; padding:30px; color:#64748b; }
</style>
</head>
<body>
<div class="hero">
  <h1>${name}</h1>
  <p>${name} · 让一切更简单高效</p>
  <a class="btn" href="#features">立即体验</a>
</div>
<div class="features" id="features">
  <div class="card"><h3>🚀 快速启动</h3><p>秒级创建，即刻使用</p></div>
  <div class="card"><h3>🔒 安全可靠</h3><p>数据加密，稳定运行</p></div>
  <div class="card"><h3>📱 全端兼容</h3><p>手机、平板、电脑均可使用</p></div>
</div>
<footer>© 2026 ${name} · 全托管运营系统自动生成</footer>
</body>
</html>`,
      'README.md': `# ${name}\n\n由「全托管运营赚钱系统」自动生成。\n\n## 部署\n\n静态站点可直接部署到任意平台。\n`
    };
  }

  buildApp(name, theme) {
    return {
      'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="${this.themeColor(theme)}">
<link rel="manifest" href="/manifest.webmanifest">
<title>${name}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:system-ui,sans-serif; background:#1e1b4b; color:#e0e7ff; padding:20px; text-align:center; }
h1 { font-size:1.8rem; margin:20px 0; color:${this.themeColor(theme)}; }
.counter { font-size:4rem; font-weight:700; margin:30px 0; }
button { font-size:1.2rem; padding:14px 28px; margin:0 8px; border:0; border-radius:12px; background:${this.themeColor(theme)}; color:#fff; cursor:pointer; }
.card { background:#312e81; padding:24px; border-radius:16px; max-width:400px; margin:30px auto; }
</style>
</head>
<body>
<div class="card">
  <h1>${name}</h1>
  <div class="counter" id="count">0</div>
  <button onclick="document.getElementById('count').textContent=+document.getElementById('count').textContent+1">+1</button>
  <button onclick="document.getElementById('count').textContent=0">归零</button>
</div>
<script>
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
</script>
</body>
</html>`,
      'manifest.webmanifest': JSON.stringify({ name, short_name: name, start_url: '/', display: 'standalone', background_color: '#1e1b4b', theme_color: this.themeColor(theme), icons: [] }, null, 2),
      'sw.js': `const CACHE = '${name}-v1';\nself.addEventListener('install', e => self.skipWaiting());\nself.addEventListener('activate', e => self.clients.claim());\nself.addEventListener('fetch', e => {});\n`,
      'README.md': `# ${name}\n\nPWA 应用，可安装到手机 / 桌面。\n`
    };
  }

  buildAITool(name) {
    return {
      'server.js': `const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// ${name} AI 工具服务
const ZHIPU_KEY = process.env.ZHIPU_API_KEY || '';

app.post('/api/tool', async (req, res) => {
  const { prompt, input } = req.body || {};
  if (!ZHIPU_KEY) {
    return res.json({ success: true, result: '[AI服务未配置API Key] 已使用本地处理: ' + (input || prompt || '') });
  }
  try {
    const r = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ZHIPU_KEY },
      body: JSON.stringify({ model: 'glm-4-flash', messages: [{ role: 'user', content: prompt + '\\n\\n' + (input || '') }], max_tokens: 1024 })
    });
    const data = await r.json();
    res.json(data.choices?.[0]?.message?.content || data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: '${name}' }));
app.listen(process.env.PORT || 3000, () => console.log('${name} running'));
`,
      'package.json': JSON.stringify({ name, version: '1.0.0', scripts: { start: 'node server.js' }, dependencies: { express: '^4.18.2', cors: '^2.8.5' } }, null, 2),
      'README.md': `# ${name}\n\nAI 工具服务。设置环境变量 ZHIPU_API_KEY 后即可启用真实 AI 能力。\n`
    };
  }

  buildPainTool(name) {
    return {
      'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name} - 痛点一键解决</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:system-ui,sans-serif; background:#0c0a09; color:#fafaf9; min-height:100vh; display:flex; align-items:center; justify-content:center; }
.box { max-width:640px; width:90%; padding:40px; background:#1c1917; border-radius:16px; text-align:center; }
h1 { margin-bottom:8px; color:#fbbf24; font-size:1.8rem; }
.sub { color:#a8a29e; margin-bottom:24px; }
textarea, input[type=file] { width:100%; padding:14px; border-radius:8px; border:1px solid #44403c; background:#292524; color:#fafaf9; font-size:1rem; margin-bottom:16px; }
button { width:100%; padding:16px; border:0; border-radius:10px; background:linear-gradient(135deg,#f59e0b,#ef4444); color:#fff; font-size:1.1rem; font-weight:700; cursor:pointer; }
output { display:block; margin-top:20px; padding:16px; background:#292524; border-radius:8px; min-height:60px; white-space:pre-wrap; text-align:left; font-size:.9rem; }
</style>
</head>
<body>
<div class="box">
  <h1>${name}</h1>
  <p class="sub">粘贴内容，一键处理，秒级完成</p>
  <textarea id="input" rows="6" placeholder="在这里粘贴/输入要处理的内容..."></textarea>
  <button onclick="run()">🚀 立即处理</button>
  <output id="out"></output>
</div>
<script>
function run() {
  const input = document.getElementById('input').value;
  let result = input;
  if (!input) { result = '提示：请先输入内容'; }
  else {
    result = input
      .replace(/\\s+/g, ' ')
      .trim();
    if (result.length > 500) result = result.slice(0, 500) + '…';
  }
  document.getElementById('out').textContent = '✅ 处理完成：\\n' + result;
}
</script>
</body>
</html>`,
      'README.md': `# ${name}\n\n痛点工具：粘贴即用，一键解决。\n`
    };
  }

  buildMiniProgram(name) {
    return {
      'app.json': JSON.stringify({ pages: ['pages/index/index'], window: { navigationBarTitleText: name, navigationBarBackgroundColor: '#4f46e5', navigationBarTextStyle: 'white' } }, null, 2),
      'app.js': `App({ onLaunch() { console.log('${name} 启动'); } });`,
      'pages/index/index.json': JSON.stringify({ usingComponents: {} }, null, 2),
      'pages/index/index.wxml': `<view class="container">
  <view class="title">${name}</view>
  <text class="desc">由全托管运营系统生成的微信小程序</text>
  <button class="btn" bindtap="onTap">点击体验</button>
</view>`,
      'pages/index/index.wxss': `.container{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#eef2ff;}
.title{font-size:48rpx;font-weight:bold;color:#4f46e5;margin-bottom:20rpx;}
.desc{font-size:26rpx;color:#64748b;}
.btn{background:#4f46e5;color:#fff;border-radius:16rpx;padding:20rpx 60rpx;margin-top:60rpx;}`,
      'pages/index/index.js': `Page({ onTap() { wx.showToast({ title: '欢迎使用${name}', icon: 'success' }); } });`,
      'project.config.json': JSON.stringify({ appid: 'touristappid', projectname: name, setting: { urlCheck: false }, compileType: 'miniprogram' }, null, 2),
      'README.md': `# ${name}\n\n微信小程序，可在微信开发者工具中导入并上传。\n`
    };
  }

  buildMiniGame(name) {
    return {
      'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:system-ui,sans-serif; background:#18181b; color:#fff; text-align:center; overflow:hidden; }
h1 { font-size:1.3rem; padding:10px; color:#fbbf24; }
canvas { background:#27272a; border-radius:8px; }
.score { position:absolute; top:14px; right:20px; font-size:1.2rem; }
button { margin-top:12px; padding:10px 26px; border:0; border-radius:8px; background:#fbbf24; color:#18181b; font-weight:700; cursor:pointer; }
</style>
</head>
<body>
<h1>${name} 🎮</h1>
<div class="score">得分: <span id="score">0</span></div>
<canvas id="game" width="400" height="400"></canvas>
<br>
<button onclick="resetGame()">重新开始</button>
<script>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const SIZE = 20;
let snake = [{x:6,y:6}], dir = {x:1,y:0}, food = {x:8,y:8}, score = 0, timer;

function spawnFood() {
  do { food = {x:Math.floor(Math.random()*20), y:Math.floor(Math.random()*20)}; }
  while (snake.some(s => s.x===food.x && s.y===food.y));
}
function tick() {
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (head.x < 0 || head.y < 0 || head.x >= 20 || head.y >= 20 || snake.some(s => s.x===head.x && s.y===head.y)) {
    return clearInterval(timer);
  }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) { score += 10; spawnFood(); }
  else snake.pop();
  document.getElementById('score').textContent = score;
  draw();
}
function draw() {
  ctx.clearRect(0,0,400,400);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(food.x*SIZE, food.y*SIZE, SIZE-2, SIZE-2);
  ctx.fillStyle = '#22c55e';
  snake.forEach((s,i) => ctx.fillRect(s.x*SIZE, s.y*SIZE, SIZE-2, SIZE-2));
}
document.addEventListener('keydown', e => {
  if (e.key==='ArrowUp') dir = e.key==='ArrowUp' ? (dir.y?dir:{x:0,y:-1}) : dir;
  if (e.key==='ArrowDown') dir = e.key==='ArrowDown' ? (dir.y?dir:{x:0,y:1}) : dir;
  if (e.key==='ArrowLeft') dir = e.key==='ArrowLeft' ? (dir.x?dir:{x:-1,y:0}) : dir;
  if (e.key==='ArrowRight') dir = e.key==='ArrowRight' ? (dir.x?dir:{x:1,y:0}) : dir;
});
function resetGame() { clearInterval(timer); snake=[{x:6,y:6}]; dir={x:1,y:0}; score=0; spawnFood(); draw(); timer=setInterval(tick,120); }
resetGame();
</script>
</body>
</html>`,
      'README.md': `# ${name}\n\nHTML5 小游戏，打开即玩。\n`
    };
  }

  buildDesktopAI(name) {
    return {
      'server.js': `const http = require('http');
const { EOL } = require('os');

// ${name} 本地桌面 AI 助手
const PORT = 8787;
const bio = [
  '你好，我是${name}，你的本地 AI 助手。',
  '我可以：回答常识问题 · 记录便签 · 提醒待办 · 计算器',
  '输入 "help" 查看所有指令。'
];

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const { message } = JSON.parse(body || '{}');
      const reply = handle(message || '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    });
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(\`<html><head><meta charset="utf-8"><title>${name}</title></head>
<style>body{font-family:system-ui;background:#111827;color:#e5e7eb;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{width:420px;background:#1f2937;border-radius:14px;padding:24px}
h1{color:#8b5cf6;font-size:1.4rem}h2{font-size:.95rem;color:#9ca3af}
#log{height:220px;overflow-y:auto;background:#111827;border-radius:8px;padding:10px;margin:12px 0;font-size:.9rem}
input{width:calc(100% - 16px);padding:12px;border:0;border-radius:8px;background:#111827;color:#fff;font-size:1rem}
.row{display:flex;gap:8px}button{border:0;border-radius:8px;background:#8b5cf6;color:#fff;padding:0 18px}</style>
<body><div class="box"><h1>🤖 ${name}</h1><h2>本地桌面 AI 助手 · 运行于 localhost:8787</h2>
<div id="log"></div><div class="row"><input id="in" placeholder="输入消息..." onkeydown="if(event.key==='Enter')send()"><button onclick="send()">发送</button></div></div>
<script>
const log=document.getElementById('log');
function send(){const i=document.getElementById('in');const m=i.value.trim();if(!m)return;
log.innerHTML+='<div>👤 '+m+'</div>';i.value='';
fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
.then(r=>r.json()).then(d=>{log.innerHTML+='<div>🤖 '+d.reply+'</div>';log.scrollTop=log.scrollHeight;});
}
log.innerHTML='<div>🤖 ${name} 已启动，输入 help 查看功能。</div>';
</script></body></html>\`);
  } else {
    res.writeHead(404); res.end();
  }
});

function handle(msg) {
  const m = msg.toLowerCase();
  if (m === 'help') return '指令：help · 时间 · 计算 2+3 · 其他任意问题';
  if (m.includes('时间')) return '当前时间：' + new Date().toLocaleString();
  if (m.includes('计算')) {
    try { const expr = m.split('计算')[1].trim(); return '结果 = ' + Function('return ' + expr.replace(/[^0-9+\\-*/(). ]/g, ''))(); }
    catch (e) { return '无法计算该表达式'; }
  }
  return '（本地助手）你说的是："' + msg + '"？输入 help 可看功能。';
}
bio.forEach(b => console.log('  ' + b));
server.listen(PORT, () => console.log('${name} 桌面助手运行中 → http://localhost:' + PORT));
`,
      'package.json': JSON.stringify({ name, version: '1.0.0', scripts: { start: 'node server.js' } }, null, 2),
      'README.md': `# ${name}\n\n桌面 AI 助手，运行 node server.js 即可在浏览器内使用。\n`
    };
  }

  themeColor(theme) {
    const colors = { default: '#6366f1', emerald: '#10b981', rose: '#f43f5e', amber: '#f59e0b', cyan: '#06b6d4' };
    return colors[theme] || colors.default;
  }

  sanitizeName(name) {
    const sanitized = name.replace(/[^\w\u4e00-\u9fa5-]/g, '').slice(0, 30);
    return sanitized || '智能产品';
  }

  pickName(type) {
    const list = this.trends[type] || [];
    return list[Math.floor(Math.random() * list.length)] || '自动化产品';
  }

  pickRandomType() {
    const keys = Object.keys(PRODUCT_TYPES);
    return keys[Math.floor(Math.random() * keys.length)];
  }

  makeId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  list() {
    return Array.from(this.products.values()).map(p => ({
      id: p.id, type: p.type, name: p.name, description: p.description,
      createdAt: p.createdAt, savedDir: p.savedDir, fileCount: Object.keys(p.files).length
    }));
  }

  get(id) {
    return this.products.get(id);
  }
}

module.exports = { ProductFactory, PRODUCT_TYPES };