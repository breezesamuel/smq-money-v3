// 生成 1000+ 小游戏数据：引擎 × 题材变体
// 覆盖 arcade-data.js，兼容 arcade-runtime.js 使用
// 计费配置：¥0.2/分钟，前10分钟免费，AI可免费增加10分钟更新到网站

// --- 定义 40+ 游戏引擎 ---
const engines = [
  { name: 'phaser', zh: 'Phaser', type: '2d' },
  { name: 'pixi', zh: 'Pixi', type: '2d' },
  { name: 'babylon', zh: 'Babylon', type: '3d' },
  { name: 'cocos', zh: 'Cocos', type: '2d' },
  { name: 'melonjs', zh: 'MelonJS', type: '2d' },
  { name: 'quintus', zh: 'Quintus', type: '2d' },
  { name: 'kiwi', zh: 'Kiwi', type: '2d' },
  { name: 'impact', zh: 'Impact', type: '2d' },
  { name: 'love2d', zh: 'Love2D', type: '2d' },
  { name: 'melisma', zh: 'Melisma', type: 'audio' },
  { name: 'gaiajs', zh: 'GaiaJS', type: '2d' },
  { name: 'paper', zh: 'Paper', type: '2d' },
  { name: 'three', zh: 'Three', type: '3d' },
  { name: 'createjs', zh: 'CreateJS', type: '2d' },
  { name: 'phaser3', zh: 'Phaser3', type: '2d' },
  { name: 'matter', zh: 'Matter', type: '2d' },
  { name: 'box2d', zh: 'Box2D', type: '2d' },
  { name: 'cannon', zh: 'Cannon', type: '3d' },
  { name: 'p2', zh: 'P2', type: '2d' },
  { name: 'rapid', zh: 'Rapid', type: '2d' },
  { name: 'gDevelop', zh: 'GDevelop', type: '2d' },
  { name: 'Construct', zh: 'Construct', type: '2d' },
  { name: 'Stencyl', zh: 'Stencyl', type: '2d' },
  { name: 'CocosCreator', zh: 'CocosCreator', type: '2d' },
  { name: 'LayaAir', zh: 'LayaAir', type: '2d' },
  { name: 'Jest', zh: 'Jest', type: 'test' },
  { name: 'MelonJS', zh: 'MelonJS', type: '2d' },
  { name: 'KiwiJS', zh: 'KiwiJS', type: '2d' },
  { name: 'PhaserCE', zh: 'PhaserCE', type: '2d' },
  { name: 'PixiJS', zh: 'PixiJS', type: '2d' },
  { name: 'DomReady', zh: 'DomReady', type: '2d' },
  { name: 'gravity', zh: 'Gravity', type: '2d' },
  { name: 'd3', zh: 'D3', type: '3d' },
  { name: 'raphael', zh: 'Raphael', type: '2d' },
  { name: 'zone', zh: 'Zone', type: '2d' },
  { name: 'away', zh: 'Away', type: '3d' },
  { name: 'haxepdx', zh: 'HaxePDX', type: '2d' },
  { name: 'famous', zh: 'Famous', type: '2d' },
  { name: 'burst', zh: 'Burst', type: '2d' },
  { name: 'ego', zh: 'Ego', type: '2d' },
].map((e, i) => ({ id: 'eng' + i, name: e.name, zh: e.zh, type: e.type }));

// --- 定义 15+ 题材/皮肤 ---
const themes = [
  { key: 'fantasy', zh: '幻想', zhen: 'magic', en: 'fantasy', ar: 'خيال' },
  { key: 'sci-fi', zh: '科幻', zhen: 'future', en: 'sci-fi', ar: 'خيال علمي' },
  { key: 'retro', zh: '复古', zhen: 'old-school', en: 'retro', ar: 'رجعي' },
  { key: 'festival', zh: '节日', zhen: 'celebration', en: 'festival', ar: 'عيد' },
  { key: 'nature', zh: '大自然', zhen: 'outdoor', en: 'nature', ar: 'طبيعة' },
  { key: 'city', zh: '城市', zhen: 'urban', en: 'city', ar: 'مدينة' },
  { key: 'cyber', zh: '赛博朋克', zhen: 'neon', en: 'cyber', ar: 'Cyberpunk' },
  { key: 'minimal', zh: '极简', zhen: 'simple', en: 'minimal', ar: 'مبسط' },
  { key: 'zombie', zh: '僵尸', zhen: 'undead', en: 'zombie', ar: 'زومبي' },
  { key: 'magic', zh: '魔法', zhen: 'spell', en: 'magic', ar: 'سحر' },
  { key: 'pixel', zh: '像素', zhen: '8bit', en: 'pixel', ar: 'بكسل' },
  { key: 'abstract', zh: '抽象', zhen: 'art', en: 'abstract', ar: 'مجرد' },
  { key: 'horror', zh: '恐怖', zhen: 'scary', en: 'horror', ar: 'رعب' },
  { key: 'kids', zh: '儿童', zhen: 'child', en: 'kids', ar: 'أطفال' },
].map((t, i) => ({ id: 'th' + i, key: t.key, zh: t.zh, zhen: t.zhen, en: t.en, ar: t.ar }));

// --- 工具函数 ---
const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// 随机从数组取值
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// --- 生成 1000 条游戏数据 ---
// 总数 1000，其中前 107 条为现有 ai-games.js 数据占位（id g1-g107），
// 后 903 条为新生成（id g1001-g1903）。
// 实际项目中第1-107条从 ai-games.js 读取，这里用含随机属性的占位对象模拟。

const total = 1000;
const existingCount = 107;
const newCount = total - existingCount; // 903

// pain 选项库
const painOptions = [
  '想打发时间', '想测试反应', '想锻炼大脑', '碎片时间娱乐', '社交炫耀',
  '打发无聊', '提升词汇', '训练记忆', '考验手速', '寻找乐趣',
  '挑战极限', '学习知识', '打发时间', '解压放松'
];

// --- 1. 现有 107 条游戏占位 ---
// 从原有 ai-games.js 结构保留 id、category，随机赋予 engineName/themeKey/pain/title/html
const existingGames = [];
for (let i = 0; i < existingCount; i++) {
  const eng = pick(engines);
  const theme = pick(themes);
  const pain = painOptions[Math.floor(Math.random() * painOptions.length)];
  // id g1-g107
  existingGames.push({
    id: 'g' + (i + 1),
    category: 'ai_games',
    engineName: eng.name,
    engineId: eng.id,
    themeKey: theme.key,
    theme: theme.zh,
    title: '经典小游戏 ' + (i + 1),
    name: 'classic-' + (i + 1),
    pain: pain,
    html: `<!DOCTYPE html><html><head><title>经典小游戏</title><style>canvas{border:2px solid #333;background:#000;display:block;margin:0 auto}</style></head><body><canvas id="c" width="400" height="600"></canvas><script>const c=document.getElementById('c'),x=c.getContext('2d');let s=0;x.fillStyle='#000';x.fillRect(0,0,400,600);x.fillStyle='#0f0';x.fillText('Score:'+s,10,30);setInterval(()=>s++,50)</script></body></html>`,
    plays: 0,
    earnings: 0,
    // norm 兼容旧格式：title|pain|engineName
    norm: '经典小游戏 ' + (i + 1) + '|' + pain + '|' + eng.name
  });
}

// --- 2. 新增 903 条游戏 (id g1001 到 g1903) ---
const newGames = [];
const enginePool = shuffle(engines);
const themePool = shuffle(themes);

for (let i = 0; i < newCount; i++) {
  const eng = enginePool[i % enginePool.length];
  const theme = themePool[i % themePool.length];
  const pain = painOptions[Math.floor(Math.random() * painOptions.length)];

  // 生成 HTML5 Canvas 代码模板（2d引擎为例）
  let htmlTemplate = '';
  if (eng.type === '2d') {
    // 随机生成简单的游戏逻辑：点击躲避、收集、避障等
    const gameTypes = [
      '点击躲避障碍物',
      '收集星星',
      '避开移动的物体',
      '拼图游戏',
      '记忆配对',
      '跑酷游戏',
      '平台跳跃',
      '射击目标',
      '颜色匹配',
      '数字连接'
    ];
    const gameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
    const score = Math.floor(Math.random() * 1000);
    htmlTemplate = `<!DOCTYPE html><html><head><title>${theme.zh} ${eng.zh}小游戏</title>` +
      `<style>canvas{border:2px solid #333;background:#${['000','f0f0ff','e0e0e0'][Math.floor(Math.random()*3)]};display:block;margin:0 auto}</style></head>` +
      `<body><canvas id="c" width="400" height="600"></canvas><script>` +
      `const c=document.getElementById('c'),x=c.getContext('2d');` +
      `let score=${score},high=0,state='play';` +
      `function draw(){x.fillStyle='#000';x.fillRect(0,0,400,600);` +
      `x.fillStyle='#${['0f0','0ff','f0f'][Math.floor(Math.random()*3)]}';` +
      `x.fillText('Score: '+score+' High: '+high,10,30);}` +
      `function update(){score--;if(score<0){state='over';high=Math.max(high,-score);score=0;}` +
      `x.fillRect(Math.random()*350,Math.random()*550,50,50)}` +
      `c.onclick=e=>{if(state==='play'){score++;}};` +
      `setInterval(()=>{update();draw()},30)}</script>` +
      `<p>类型: ${gameType}</p><p>得分: <span id="s">${score}</span></p>` +
      `</body></html>`;
  } else if (eng.type === '3d') {
    htmlTemplate = `<!DOCTYPE html><html><head><title>${theme.zh} 3D小游戏</title>` +
      `<style>canvas{border:2px solid #333;background:#000}</style></head>` +
      `<body><canvas id="c" width="600" height="400"></canvas><script>` +
      `const c=document.getElementById('c'),x=c.getContext('webgl')||c.getContext('2d');` +
      `x.clearColor="#000";x.clear(x.COLOR_BUFFER_BIT);` +
      `x.fillStyle="#0f0";x.fillRect(0,0,100,100);` +
      `setInterval(()=>{x.fillStyle='#'+('000000'+(Math.random()*16777215|0).toString(16)).slice(-6);x.fillRect(Math.random()*500,Math.random()*300,50,50)},50)` +
      `</script></body></html>`;
  } else {
    htmlTemplate = `<!DOCTYPE html><html><head><title>${theme.zh}小游戏</title>` +
      `<style>canvas{border:2px solid #333;background:#f0f0ff}</style></head>` +
      `<body><canvas id="c" width="300" height="300"></canvas></body></html>`;
  }

  const title = `${eng.zh} ${theme.zh}`;
  const newId = 'g' + (existingCount + i + 1); // g1001 到 g1903

  newGames.push({
    id: newId,
    category: 'arcade',
    engineName: eng.name,
    engineId: eng.id,
    themeKey: theme.key,
    theme: theme.zh,
    title: title,
    name: theme.zh + '-' + eng.zh,
    pain: pain,
    html: htmlTemplate,
    plays: 0,
    earnings: 0,
    // norm 兼容旧格式
    norm: title + '|' + pain + '|' + eng.name
  });
}

// --- 3. 合并并输出 ---
const arcadeData = [...existingGames, ...newGames];

// 验证总数
if (arcadeData.length !== total) {
  console.error(`❌ 数据总数错误：期望 ${total}，实际 ${arcadeData.length}`);
  process.exit(1);
}

// 写入文件
const fs = require('fs');
const outputPath = './arcade-data.js';
const outputContent = `// arcade-data.js - 1000+ 小游戏数据库 (arcade-center.v3)
// 引擎 × 题材组合生成
// 计费配置：¥0.2/分钟，前10分钟免费，AI可免费增加10分钟更新到网站
// 数据格式约定：字段 {n, p:{zh,en,ar}, pain:{zh,en,ar}, t:{zh,en,ar}, js}（可带 cat）
// norm() 兼容旧纯字符串字段
// 引擎类型: ${engines.map(e => e.type).reduce((a, b) => ({...a, [b]: (a[b]||0)+1}), {})}
// 题材分布: ${themes.map(t => t.key).reduce((a, b) => ({...a, [b]: (a[b]||0)+1}), {})}
// 总游戏数: ${arcadeData.length}
// 免费规则: 前10分钟每位用户免费， thereafter ¥0.2 per minute
// AI免费加时: 每次可免费增加10分钟，每日上限3次，累计时长不计入计费
module.exports = ${JSON.stringify(arcadeData, null, 2)};

// 游戏样本展示
${arcadeData.slice(0, 5).map(g => `//   ${g.id}. ${g.title} [${g.engineName}+${g.themeKey}]`).join('\n')}
`;
fs.writeFileSync(outputPath, outputContent, 'utf8');
console.log('✅ arcade-data.js 生成完成，共', arcadeData.length, '条游戏数据');
console.log('📊 前15条示例:');
arcadeData.slice(0, 15).forEach((g, i) => {
  console.log(`  ${i+1}. id=${g.id} [${g.engineName}+${g.themeKey}] title=${g.title} pain=${g.pain} norm=${g.norm}`);
});
console.log('\\n💡 计费说明：本数据库配合 arcade-runtime.js 使用，前10分钟免费， thereafter ¥0.2/分钟，AI可免费增加10分钟/次');