// scripts/expand-tools.js - 批量扩充 tools.json 到 500+（AI 生成全新三语工具）
// 用法: node scripts/expand-tools.js [--batch 12] [--target 190] [--cat life]
require('../lib/env').ensureEnv('.env');
const fs = require('fs');
const path = require('path');
const { loadTools } = require('../api/lib');
const { modelRouter } = require('../ai-core/model-router');

const TOOLS_FILE = path.join(__dirname, '..', 'tools-data', 'tools.json');
const data = loadTools();
let tools = data.tools;

const CATS = {
  ai_games: { zh: 'AI & 游戏', en: 'AI & Games', ar: 'ألعاب وذكاء اصطناعي' },
  life: { zh: '生活痛点', en: 'Life Hacks', ar: 'حيل الحياة' },
  worker: { zh: '打工人', en: 'Workplace Power', ar: 'أدوات العمل' }
};

// 现有最高 id
const existing = new Set(tools.map(t => t.id));
function nextId() {
  let n = 1200;
  for (;;) {
    const id = 'g' + n;
    if (!existing.has(id)) { existing.add(id); return id; }
    n++;
  }
}

async function generateBatch(batchSize, cat, attempt = 0) {
  const theme = cat === 'ai_games' ? 'AI工具与AI小游戏、AI娱乐爽点' : cat === 'life' ? '日常生活痛点、省钱、健康、家务、出行、育儿、兴趣' : '职场打工人痛点：汇报、沟通、效率、表格、面试、离职、摸鱼安全';
  const prompt = `Create ${batchSize} brand new practical AI-empowered micro-tools for a Chinese "pain point toolbox" website, in category "${cat}".
Focus on everyday pains in: ${theme}. Each must be a REAL useful tool, concrete and specific, NOT vague. All original ideas, none of these existing: 去重, 字数, base64, json格式化, url编码, 时间戳, 密码生成, uuid, bmi, 汇率, 鞋码, 盐摄入, 周报, 辞职信, 道歉, 催办, 离职告别, 房贷月供.

For each tool provide id-less item:
{
  "slug": "kebab-case-english",
  "category": "${cat}",
  "zh": { "title": "中文标题", "pain": "一句话痛点", "desc": "一段中文描述怎么做" },
  "en": { "title": "English Title", "pain": "English pain", "desc": "English description" },
  "ar": { "title": "العنوان", "pain": "الوصف", "desc": "وصف" }
}
Rules: zh and en and ar MUST all be filled in native language (ar = real Arabic). title<=16 chars, pain<=24 chars, desc<=36 chars.
Output STRICT JSON only, no markdown, no code fence, shape: {"items":[...]}
The items array must contain exactly ${batchSize} items.`;
  const r = await modelRouter.call(prompt, { maxTokens: 6000, temperature: 0.85 });
  if (r.error) {
    if (attempt < 2) {
      console.log('  retry in 8s... attempt ' + (attempt + 1));
      await new Promise(r2 => setTimeout(r2, 8000));
      return generateBatch(batchSize, cat, attempt + 1);
    }
    throw new Error('GEN_FAILED: ' + r.error);
  }
  const m = r.content.match(/\{[\s\S]*\}/);
  if (!m) {
    if (attempt < 2) { await new Promise(r2 => setTimeout(r2, 8000)); return generateBatch(batchSize, cat, attempt + 1); }
    throw new Error('no json from ' + r.model);
  }
  try { return JSON.parse(m[0]); } catch (e) { throw new Error('parse fail'); }
}

function norm(rec) {
  const kebab = (rec.slug || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('tool-' + Math.random().toString(36).slice(2, 6));
  const zhTitle = String(rec.zh && rec.zh.title || '').trim();
  if (!zhTitle) return null;
  const catMeta = CATS[rec.category] || CATS.life;
  return {
    id: nextId(),
    slug: kebab,
    category: rec.category === 'ai_games' ? 'ai_games' : rec.category === 'worker' ? 'worker' : 'life',
    type: rec.category === 'ai_games' ? 'game' : 'utility',
    pricing: { freeUses: 10, monthly: 10, lifetime: 99, currency: 'CNY' },
    name: {
      zh: { title: zhTitle, pain: String(rec.zh.pain || '').slice(0, 30), category: catMeta.zh, desc: String(rec.zh.desc || '').slice(0, 60) },
      en: { title: String(rec.en && rec.en.title || kebab.split('-').map(w => w[0] ? w[0].toUpperCase() + w.slice(1) : w).join(' ')).slice(0, 40), pain: String(rec.en && rec.en.pain || '').slice(0, 40), category: catMeta.en, desc: String(rec.en && rec.en.desc || 'An AI tool for your daily pain.').slice(0, 120) },
      ar: { title: String(rec.ar && rec.ar.title || 'أداة ' + zhTitle).slice(0, 40), pain: String(rec.ar && rec.ar.pain || '').slice(0, 60), category: catMeta.ar, desc: String(rec.ar && rec.ar.desc || 'أداة ذكية لحل مشكلتك.').slice(0, 120) }
    }
  };
}

function save() {
  const stats = {
    total: tools.length,
    byCategory: { ai_games: tools.filter(t => t.category === 'ai_games').length, life: tools.filter(t => t.category === 'life').length, worker: tools.filter(t => t.category === 'worker').length }
  };
  fs.writeFileSync(TOOLS_FILE, JSON.stringify({ ...data, tools, stats }, null, 1), 'utf8');
  console.log('saved', tools.length, JSON.stringify(stats.byCategory));
}

async function main() {
  const target = (() => { const i = process.argv.indexOf('--target'); return i >= 0 ? Number(process.argv[i + 1]) : 190; })();
  const batchSize = (() => { const i = process.argv.indexOf('--batch'); return i >= 0 ? Number(process.argv[i + 1]) : 10; })();
  const catFilter = (() => { const i = process.argv.indexOf('--cat'); return i >= 0 ? process.argv[i + 1] : null; })();
  const want = target - tools.length;
  console.log('current=' + tools.length + ' want=>' + target + ' need=' + want + ' batch=' + batchSize + ' cat=' + (catFilter || 'all'));

  const catCycle = catFilter ? [catFilter] : ['life', 'worker', 'ai_games'];
  let added = 0, failed = 0;
  let pass = 0;
  while (added < want) {
    const cat = catCycle[pass++ % catCycle.length];
    const n = Math.min(batchSize, want - added);
    try {
      const out = await generateBatch(n, cat);
      const items = out.items || [];
      let okc = 0;
      for (const rec of items) {
        const t = norm(rec);
        if (!t) continue;
        // 防重复标题
        if (tools.some(x => x.name.zh.title === t.name.zh.title)) continue;
        tools.push(t);
        okc++;
        added++;
        if (added >= want) break;
      }
      console.log(`  batch+${okc} added=${added}/${want} cat=${cat}`);
    } catch (e) {
      failed++;
      console.log('  ERR:', e.message, 'failed=', failed);
      await new Promise(r => setTimeout(r, 5000));
    }
    if (failed > 6) { console.log('too many failures, giving up'); break; }
    if (added >= want) break;
    save();
    await new Promise(r => setTimeout(r, 1500));
  }
  save();
  console.log(`done added=${added} failedBatch=${failed} total=${tools.length}`);
}

main().then(() => process.exit(0)).catch(e => { console.error('FATAL', e.message); process.exit(1); });