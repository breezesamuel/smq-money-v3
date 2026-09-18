// scripts/daily-release.js - 每日上新管线：生成新工具 -> 建推广 campaign -> 重建SEO -> 部署
// 用法: node scripts/daily-release.js [--n 8] [--deploy 1]
require('../lib/env').ensureEnv('.env');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadTools } = require('../api/lib');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? (process.argv[i + 1] != null ? process.argv[i + 1] : def) : def;
}

const ROOT = path.join(__dirname, '..');
const TOOLS_FILE = path.join(ROOT, 'tools-data', 'tools.json');

async function main() {
  const n = Number(arg('n', 8));
  const deploy = Number(arg('deploy', 0));

  const before = loadTools().tools.map(t => t.id);

  console.log('=== 每日上新管线 ===', new Date().toISOString());

  // 1) 扩展现有 tools.json（增加 n 个三语新工具，AI 生成）
  const target = before.length + n;
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'expand-tools.js'), '--target', String(target), '--batch', String(n)], { cwd: ROOT, encoding: 'utf8' });
  console.log('expand exit:', r.status);
  if (r.stdout) console.log(r.stdout.split('\n').slice(-12).join('\n'));

  const after = loadTools().tools;
  const fresh = after.filter(t => !before.includes(t.id));
  console.log('新增工具:', fresh.length);
  for (const t of fresh.slice(0, 20)) console.log('  -', t.id, t.name.zh.title, '|', t.name.en.title);

  // 2) 写入"今日上新"记录（供周报/推广引用）
  const releasesFile = path.join(ROOT, 'promo', 'releases.json');
  let releases = [];
  try { releases = JSON.parse(fs.readFileSync(releasesFile, 'utf8')); } catch (e) {}
  if (fresh.length) {
    releases.push({
      date: new Date().toISOString().slice(0, 10),
      at: new Date().toISOString(),
      tools: fresh.map(t => ({ id: t.id, slug: t.slug, title: t.name.zh.title, en: t.name.en.title, pain: t.name.zh.pain, category: t.category }))
    });
    releases = releases.slice(-365);
    fs.writeFileSync(releasesFile, JSON.stringify(releases, null, 2), 'utf8');
    console.log('releases.json 已更新');
  }

  // 3) 触发当日推广 campaign（含今日上新）
  try {
    const promo = spawnSync(process.execPath, [path.join(ROOT, 'promo', 'run-daily.js'), '--arcade', '2', '--tools', String(Math.max(2, n))], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
    console.log('promo exit:', promo.status);
    if (promo.stdout) console.log(promo.stdout.split('\n').filter(l => /campaign|dispatched|生成|分发|示例/.test(l)).join('\n'));
  } catch (e) { console.log('promo skip:', e.message); }

  // 4) 重建 SEO + 前端
  const seo = spawnSync(process.execPath, [path.join(ROOT, 'frontend', 'scripts', 'gen-seo.js')], { cwd: path.join(ROOT, 'frontend'), encoding: 'utf8' });
  console.log('seo exit:', seo.status, (seo.stdout || '').trim());

  // 5) 可选部署
  if (deploy) {
    console.log('部署进行中...');
    const p2 = spawnSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', process.env.DEPLOY_PS1 || 'C:/Users/Think/AppData/Local/Temp/opencode/deploy-smq4.ps1'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
    console.log(p2.stdout ? p2.stdout.split('\n').slice(-8).join('\n') : 'no deploy output');
  }
  console.log('=== 每日上新完成 ===');
}

main().then(() => process.exit(0)).catch(e => { console.error('ERROR:', e.message); process.exit(1); });