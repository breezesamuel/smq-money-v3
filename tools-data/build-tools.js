const fs = require('fs');
const path = require('path');

const games = require('./ai-games.js');
const life = require('./life-tools.js');
const worker = require('./worker-tools.js');

const CATEGORY_EN = {
  ai_games: 'AI & Games',
  life: 'Life Hacks',
  worker: 'Workplace Power'
};
const CATEGORY_AR = {
  ai_games: 'ألعاب وذكاء اصطناعي',
  life: 'حيل الحياة',
  worker: 'أدوات العمل'
};
const CATEGORY_DESC_ZH = {
  ai_games: '面向AI爱好者与玩家，解压训练反应的游戏小工具',
  life: '生活中为图方便愿意花小钱解决的痛点工具',
  worker: '打工人提高效率、少挨批评的职场工具'
};

// 英文名翻译 - 程序化翻译工具名
function toEn(title, zh, pain) {
  const map = {};
  const guess = title.replace(/工具|神器|大师|王|助手|大师/g, '')
    .replace(/计算|计算器/g, 'Calculator')
    .replace(/转换|换算/g, 'Converter')
    .replace(/生成/g, 'Generator')
    .replace(/提醒/g, 'Reminder')
    .replace(/检查/g, 'Checker')
    .replace(/检测/g, 'Detector')
    .replace(/查询/g, 'Lookup')
    .replace(/模板/g, 'Template')
    .replace(/整理/g, 'Organizer')
    .replace(/记录/g, 'Logger');
  return guess.length >= 2 ? guess : title;
}

function toAr(title, zh) {
  const map = {
    '神器': 'أداة', '计算器': 'حاسبة', '换算器': 'محول', '生成器': 'مولد',
    '提醒': 'تذكير', '检查': 'مدقق', '查询': 'بحث', '模板': 'قالب',
    '整理': 'منظم', '记录': 'سجل', '助手': 'مساعد', '大师': 'أستاذ',
    '会计师': 'محاسب', '计划': 'خطة', '预算': 'ميزانية'
  };
  for (const [k, v] of Object.entries(map)) {
    if (title.includes(k)) return title.replace(k, v);
  }
  return title + ' أداة';
}

function buildTool(t) {
  const langZh = { title: t.title, pain: t.pain, category: CATEGORY_ZH_LABEL(t.category), desc: CATEGORY_DESC_ZH[t.category] };
  const langEn = { title: toEn(t.title, t.pain, t.pain), pain: t.pain, category: CATEGORY_EN[t.category], desc: 'A handy utility tool to solve your specific pain point.' };
  const langAr = { title: toAr(t.title, t.pain), pain: t.pain, category: CATEGORY_AR[t.category], desc: 'أداة مفيدة لحل مشكلتك بسهولة وسرعة.' };
  const base = { id: t.id, slug: t.slug, category: t.category };
  const pricing = {
    freeUses: 10, // 免费使用次数
    monthly: PRICE_MONTHLY(t.category),  // 每月收费
    lifetime: PRICE_LIFETIME(t.category), // 买断
    currency: 'CNY'
  };
  // 提取的工具事件类型，便于前端渲染可交互工具
  const interactive = interactiveType(t.slug);
  return { ...base, type: interactive, pricing, name: { zh: langZh, en: langEn, ar: langAr } };
}

function CATEGORY_ZH_LABEL(c) {
  return { ai_games: 'AI & 游戏', life: '生活痛点', worker: '打工人' }[c] || c;
}

function PRICE_MONTHLY(cat) {
  const base = { ai_games: 10, life: 15, worker: 20 };
  return base[cat] || 15;
}

function PRICE_LIFETIME(cat) {
  const base = { ai_games: 99, life: 199, worker: 299 };
  return base[cat] || 199;
}

function interactiveType(slug) {
  const typeOverrides = {
    'tip-calculator': 'calculator',
    'cost-split': 'splitter',
    'unit-convert': 'converter',
    'temp-convert': 'converter',
    'bmi-advice': 'calculator',
    'overtime-calc': 'calculator',
    'salary-breakdown': 'calculator',
    'qr-make': 'qrcode',
    'password-gen': 'generator',
    'uuid-gen': 'generator',
    'base64-tool': 'converter',
    'url-encode': 'converter',
    'json-tool': 'converter',
    'timestamp-fmt': 'converter',
    'coin-flip': 'game',
    'dice-roller': 'game',
    'rock-paper': 'game',
    'reaction-shoot': 'game',
    'click-speed': 'game',
    'memory-flip': 'game',
    'snake-rush': 'game',
    '2048-master': 'game',
    'word-count': 'counter'
  };
  if (typeOverrides[slug]) return typeOverrides[slug];
  const gameish = ['game', 'rush', 'puzzle', 'mini', 'duel', 'challenge', 'guess', 'trainer', 'flip', 'pop', 'slice', 'maze', 'climb', 'quest', 'hunt', 'drop', 'bounce', 'runner', 'dash', 'stack', 'sort', 'breaker', 'shooter', 'match', 'battle', 'clicker', 'runner'];
  if (gameish.some(k => slug.includes(k))) return 'game';
  if (slug.includes('calc')) return 'calculator';
  if (slug.includes('convert') || slug.includes('transform') || slug.includes('encode')) return 'converter';
  if (slug.includes('gen') || slug.includes('make') || slug.includes('create')) return 'generator';
  return 'generator';
}

const tools = [...games, ...life, ...worker].map(buildTool);

const output = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  languages: ['zh', 'en', 'ar'],
  pricingRules: {
    freeUses: 10,
    subscriptionCNY: { min: 10, max: 100 },
    lifetimeCNY: { min: 99, max: 999 },
    referral: {
      1: 0.10, 2: 0.30, 3: 0.50, 5: 0.70, 10: 1.00
    },
    referralNote: '拉1个朋友返10%，2个返30%，3个返50%，5个返70%，拉10个永久免费'
  },
  categories: {
    ai_games: { zh: 'AI & 游戏', en: 'AI & Games', ar: 'ألعاب وذكاء اصطناعي' },
    life: { zh: '生活痛点', en: 'Life Hacks', ar: 'حيل الحياة' },
    worker: { zh: '打工人', en: 'Workplace Power', ar: 'أدوات العمل' }
  },
  tools,
  stats: { total: tools.length, byCategory: { ai_games: games.length, life: life.length, worker: worker.length } }
};

fs.writeFileSync(path.join(__dirname, 'tools.json'), JSON.stringify(output, null, 2));
console.log('✅ 已生成 tools.json:');
console.log(`   总数: ${tools.length}`);
console.log(`   AI游戏: ${games.length} | 生活: ${life.length} | 打工人: ${worker.length}`);
console.log(`   三语: ${output.languages.join(', ')}`);
console.log('   文件: ' + path.resolve(__dirname, 'tools.json') + ' (' + (fs.statSync(path.join(__dirname, 'tools.json')).size / 1024).toFixed(0) + 'KB)');