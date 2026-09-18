// scripts/i18n-fix.js - 修复 tools.json 中 en/ar 仍为中文副本的字段（AI 批量翻译）
// 用法: node scripts/i18n-fix.js [--save] [--limit 60] [--dry]
require('../lib/env').ensureEnv('.env');
const fs = require('fs');
const path = require('path');
const { loadTools } = require('../api/lib');
const { modelRouter } = require('../ai-core/model-router');

const TOOLS_FILE = path.join(__dirname, '..', 'tools-data', 'tools.json');
const data = loadTools();
const CAT = data.categories || {};
const CAT_EN = (c) => (CAT[c] && CAT[c].en) || c;
const CAT_AR = (c) => (CAT[c] && CAT[c].ar) || c;

const CJK = /[\u4e00-\u9fff]/;
function needFix(t) {
  const bad = [];
  const n = t.name || {};
  const en = n.en || {}, ar = n.ar || {}, zh = n.zh || {};
  for (const f of ['title', 'pain', 'desc']) {
    const ev = String(en[f] || '');
    if (ev && (CJK.test(ev) || /[\u0600-\u06FF]/.test(ev))) bad.push(`en.${f}`);
    const av = String(ar[f] || '');
    if (!av || !/[\u0600-\u06FF]/.test(av)) bad.push(`ar.${f}`);
    if (!zh[f]) bad.push(`zh.${f}`);
  }
  return bad;
}

async function translateBatch(batch, attempt = 0) {
  const prompt = `Translate the following tool metadata from Chinese (zh) to English (en) and Arabic (ar). Each tool has slug, category, and zh fields {title, pain, desc}.
Rules: en must be natural idiomatic English; ar must be proper Arabic (RTL). category translated per map (ai_games->"AI & Games"/"ألعاب وذكاء اصطناعي", life->"Life Hacks"/"حيل الحياة", worker->"Workplace Power"/"أدوات العمل").
Output STRICT JSON only, no markdown, shape: {"<id>":{"en":{"title":..,"pain":..,"desc":..,"category":..},"ar":{...}}}
Tools:
${JSON.stringify(batch)}`;
  const r = await modelRouter.call(prompt, { maxTokens: 4000, temperature: 0.2 });
  if (r.error) {
    if (attempt < 2) {
      console.log('  retry in 6s... (attempt ' + (attempt + 1) + ')');
      await new Promise(r2 => setTimeout(r2, 6000));
      return translateBatch(batch, attempt + 1);
    }
    throw new Error('ALL_MODELS_FAILED: ' + r.error);
  }
  const text = r.content;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) {
    if (attempt < 2) {
      await new Promise(r2 => setTimeout(r2, 6000));
      return translateBatch(batch, attempt + 1);
    }
    throw new Error('no json in response from ' + r.model);
  }
  try {
    return { parsed: JSON.parse(m[0]), model: r.model };
  } catch (e) {
    return { parseError: e.message, raw: text.slice(0, 200), model: r.model };
  }
}

function fallback(t) {
  // 模板兜底：en 保级、ar 保级
  const zh = t.name.zh;
  return {
    en: {
      title: t.slug.split('-').map(w => w[0] ? w[0].toUpperCase() + w.slice(1) : w).join(' '),
      pain: zh.pain || '', desc: 'A handy AI-powered tool to solve your specific pain point quickly.', category: CAT_EN(t.category)
    },
    ar: {
      title: 'أداة ' + (zh.title || t.slug), pain: zh.pain || '', desc: 'أداة ذكية مفيدة لحل مشكلتك بسرعة وسهولة.', category: CAT_AR(t.category)
    }
  };
}

async function main() {
  const saveMode = process.argv.includes('--save');
  const dry = process.argv.includes('--dry');
  const limit = (() => { const i = process.argv.indexOf('--limit'); return i >= 0 ? Number(process.argv[i + 1]) : 400; })();
  const tools = data.tools || [];

  const toFix = tools.filter(t => needFix(t).length);
  console.log(`tools=${tools.length} 需修复=${toFix.length} (limit=${limit})`);
  if (!toFix.length) { console.log('无需修复'); return; }
  const targets = toFix.slice(0, limit);

  let ok = 0, fb = 0, fail = 0;
  const B = 12;
  for (let i = 0; i < targets.length; i += B) {
    const batch = targets.slice(i, i + B).map(t => ({ id: t.id, slug: t.slug, category: t.category, zh: t.name.zh }));
    try {
      const { parsed, model, parseError, raw } = await translateBatch(batch);
      if (page_has_error(parsed)) throw new Error('no parsed');
      for (const id of Object.keys(parsed)) {
        const t = tools.find(x => x.id === id);
        if (!t) continue;
        const rec = parsed[id];
        const en = rec.en, ar = rec.ar;
        t.name.en = t.name.en || {}; t.name.ar = t.name.ar || {};
        t.name.en.title = en.title || t.name.en.title || t.slug;
        t.name.en.pain = en.pain || t.name.en.pain || '';
        t.name.en.desc = en.desc || t.name.en.desc || 'AI tool for your daily pain points.';
        t.name.en.category = en.category || CAT_EN(t.category);
        t.name.ar.title = ar.title || t.name.ar.title || 'أداة ' + t.slug;
        t.name.ar.pain = ar.pain || t.name.ar.pain || '';
        t.name.ar.desc = ar.desc || t.name.ar.desc || 'أداة ذكية لحل مشكلتك.';
        t.name.ar.category = ar.category || CAT_AR(t.category);
        ok++;
      }
      if (parseError) fail++;
    } catch (e) {
      console.log('  ERR batch:', e.message);
      // 整批兜底
      for (const t of batch) {
        const target = tools.find(x => x.id === t.id);
        if (!target) continue;
        const f = fallback(target);
        target.name.en = f.en; target.name.ar = f.ar;
        fb++;
      }
      fail++;
    }
    console.log(` 批 ${i / B + 1}/${Math.ceil(targets.length / B)} ok=${ok} fb=${fb} fail=${fail}`);
  }

  if (saveMode && !dry) {
    fs.writeFileSync(TOOLS_FILE, JSON.stringify({
      ...data,
      tools,
      stats: { total: tools.length, byCategory: (() => { const c = {}; for (const t of tools) c[t.category] = (c[t.category] || 0) + 1; return c; })() }
    }, null, 1), 'utf8');
    console.log('已保存 tools.json (stats 已重算)');
  } else {
    console.log('DRY RUN: 未保存', dry ? '(dry)' : '(未加 --save)');
  }
  console.log(`完成: ai修复=${ok} 模板兜底=${fb} 批失败=${fail}`);
}

function page_has_error(o) { return !o || typeof o !== 'object' || Array.isArray(o); }

main().then(() => process.exit(0)).catch(e => { console.error('FATAL:', e.message); process.exit(1); });