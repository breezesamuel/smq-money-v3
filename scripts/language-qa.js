// scripts/language-qa.js - 三语质检
// 校验 tools-data/tools.json 与 arcade-data.js / promo feed 的中文/英文/阿拉伯文正确性
// 规则: zh 含 CJK; en 纯 Latin(忽略标点/数字); ar 含 Arabic 段 \u0600-\u06FF
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CJK = /[\u4e00-\u9fff]/;
const AR = /[\u0600-\u06FF]/;
const CJK_CHARS = '[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u9640-\u964f\u2014\u201c\u201d\u2026\u3001\u3002\u3010\u3011]';

function arVisible(s) { return /[\u0600-\u06FF]/.test(s); }
function hasZh(s) { return CJK.test(s); }
function hasAr(s) { return AR.test(s); }
// en 只允许 latin + 常见标点
function looksEn(s) {
  const stripped = s.replace(/[a-zA-Z0-9\s.,!?'"()\-:;&#@%+_=[\]/\\$€£¥^*<>|~`{}]/g, '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}\u{2000}-\u{206F}\u{2014}]/gu, '');
  return stripped.length === 0;
}

const issues = [];
function report(file, id, field, lang, val, reason) {
  const langName = { zh: '中文', en: '英文', ar: '阿拉伯文' }[lang] || lang;
  issues.push({ file, id, field, lang, langName, val: String(val).slice(0, 60), reason });
}

function checkField(file, id, field, obj, isTitle) {
  const zh = obj && obj.zh ? obj.zh : null;
  const en = obj && obj.en ? obj.en : null;
  const ar = obj && obj.ar ? obj.ar : null;
  if (zh) {
    if (!hasZh(String(zh[field] || ''))) report(file, id, field + '.zh', 'zh', zh[field], '缺少中文');
  }
  if (en) {
    const v = String(en[field] || '');
    if (looksEn(v)) {
      if (hasZh(v) || hasAr(v)) report(file, id, field + '.en', 'en', v, '英文混入其他文字');
    } else {
      report(file, id, field + '.en', 'en', v, '不是有效英文');
    }
  }
  if (ar) {
    const v = String(ar[field] || '');
    if (!arVisible(v)) report(file, id, field + '.ar', 'ar', v, '缺少阿拉伯文');
  }
  return !!ar && ar && !arVisible(String(ar[field] || ''));
}

function checkTools() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools-data', 'tools.json'), 'utf8'));
  for (const t of data.tools || []) {
    for (const f of ['title', 'pain', 'desc', 'category']) {
      if (t.name) checkField('tools.json', t.id, f, t.name, f === 'title');
    }
  }
  return (data.tools || []).length;
}

function checkArcade() {
  const { readFileSync } = require('fs');
  let src;
  try { src = readFileSync(path.join(ROOT, 'arcade-data.js'), 'utf8'); } catch (e) { return 0; }
  // arcade-data.js 是 module.exports=[...]，用 require 读取
  const games = require(path.join(ROOT, 'arcade-data.js'));
  for (const g of games || []) {
    for (const [f, v] of Object.entries({ title: g.title, theme: g.theme, category: g.category })) {
      if (f === 'category') continue;
      if (!hasZh(String(v || ''))) report('arcade-data.js', g.id, f, 'zh', v, '标题缺中文');
    }
  }
  return (games || []).length;
}

function checkPromo() {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'promo-state.json'), 'utf8'));
    for (const c of state.feed || []) for (const p of c.posts || []) {
      const v = p.content || '';
      if (p.lang === 'zh' && !hasZh(v)) report('promo-state.json', p.postId, 'content', 'zh', v, '中文内容缺汉字');
      if (p.lang === 'ar' && !arVisible(v)) report('promo-state.json', p.postId, 'content', 'ar', v, '阿语内容缺阿语字符');
      if (p.lang === 'en' && !looksEn(v)) report('promo-state.json', p.postId, 'content', 'en', v, '英文内容异常');
    }
  } catch (e) { /* no promo */ }
}

function main() {
  let n = checkTools();
  let g = checkArcade();
  checkPromo();
  console.log('检查: tools=' + n + ' games=' + g + ' promo=feed');
  console.log('三语违规: ' + issues.length + ' 条');
  for (const i of issues.slice(0, 50)) {
    console.log(`  [${i.file}] ${i.id} ${i.field}(${i.lang}): ${i.reason} -> ${JSON.stringify(i.val)}`);
  }
  if (issues.length) process.exitCode = 1;
}

main();