// 轻量 .env 加载器（无第三方依赖），供本地 Node 服务使用；Vercel/Render 由平台注入环境变量
const fs = require('fs');
const path = require('path');

function ensureEnv(file) {
  const envPath = file || path.join(__dirname, '..', '.env');
  try {
    if (!fs.existsSync(envPath)) return 0;
    let n = 0;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        n++;
      }
    }
    return n;
  } catch (e) { return 0; }
}

module.exports = { ensureEnv };