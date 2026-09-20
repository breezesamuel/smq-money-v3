// scripts/verify/audit-tools.js
// 全量工具审计：把 runTool 抽取到 node 沙箱，逐个工具跑一次本地逻辑
// 统计：本地命中 / 走AI(null) / 异常；按 category 分布
// 用法：node scripts/verify/audit-tools.js
const fs = require('fs');
const path = require('path');

const APP_SRC = path.join(__dirname, '../../frontend/src/App.jsx');
const TOOLS_JSON = path.join(__dirname, '../../tools-data/tools.json');

const src = fs.readFileSync(APP_SRC, 'utf8');
const start = src.indexOf('function runTool');
const brace = src.indexOf('{', start);
let depth = 0, end = -1;
for (let i = brace; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
}
if (end < 0) { console.error('runTool 未找到'); process.exit(1); }
const fnBody = src.slice(start, end + 1);

// node 沙箱：mock 浏览器 API
const sandboxSrc = `
const btoa = s => Buffer.from(s, 'binary').toString('base64');
const unescape = s => s;
const escape = s => s;
let console = { log: () => {} };
${fnBody}
module.exports = runTool;
`;
const tmpPath = path.join(require('os').tmpdir(), 'runtool-audit-' + process.pid + '.js');
fs.writeFileSync(tmpPath, sandboxSrc);
const runTool = require(tmpPath);
fs.unlinkSync(tmpPath);

const tools = JSON.parse(fs.readFileSync(TOOLS_JSON, 'utf8')).tools;
let localHit = 0, nulls = 0, errors = 0, hint = 0;
const byCat = {};
const locByCat = {};
const errList = [];
for (const o of tools) {
  byCat[o.category] = (byCat[o.category] || 0) + 1;
  try {
    const out = runTool({ slug: o.slug, name: o.name }, '测试 100 30', 'zh');
    if (out === null) nulls++;
    else if (typeof out === 'string' && out.length > 1) { localHit++; locByCat[o.category] = (locByCat[o.category] || 0) + 1; }
    else { hint++; } // 本地但仅输入提示
  } catch (e) {
    errors++; errList.push(o.slug + ' => ' + e.message);
  }
}
console.log('总工具:', tools.length);
console.log('本地命中:', localHit, '(' + (localHit / tools.length * 100).toFixed(0) + '%)', '| 仅提示:', hint, '| 走AI:', nulls, '| 异常:', errors);
for (const c of Object.keys(byCat)) {
  const l = locByCat[c] || 0;
  console.log(`  ${c}: ${l}/${byCat[c]} = ${(l / byCat[c] * 100).toFixed(0)}%`);
}
if (errList.length) { console.log('\n== 异常工具 =='); errList.forEach(e => console.log(' ', e)); }
console.log(errors === 0 ? '\n✅ 全量审计通过，0 异常' : '\n❌ 存在 ' + errors + ' 个异常！');
process.exit(errors === 0 ? 0 : 1);