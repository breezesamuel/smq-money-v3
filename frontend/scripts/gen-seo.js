// 构建期生成 SEO 静态文件到 frontend/public（vite 自动复制到 dist）
// 生成: sitemap.xml / robots.txt / rss.xml
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '..', 'public');
const BASE = 'https://smq-v3.vercel.app';

async function loadArcade() {
  try {
    const mod = await import(pathToFileURL(path.join(ROOT, 'arcade-data.js')).href + '?t=' + Date.now());
    return mod.default || mod;
  } catch (e) { console.log('loadArcade error:', e.message); return []; }
}
async function loadTools() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools-data', 'tools.json'), 'utf8'));
    return d.tools || [];
  } catch (e) { return []; }
}

const games = await loadArcade();
const tools = await loadTools();
const now = new Date().toISOString().slice(0, 10);

// --- sitemap.xml ---
const urls = [];
urls.push({ loc: `${BASE}/`, lastmod: now, priority: 1.0, freq: 'daily' });
urls.push({ loc: `${BASE}/arcade/`, lastmod: now, priority: 0.9, freq: 'daily' });
urls.push({ loc: `${BASE}/tools`, lastmod: now, priority: 0.8, freq: 'weekly' });
tools.filter(t => t.category === 'ai_games').forEach(t => {
  urls.push({ loc: `${BASE}/tool/${t.slug}`, lastmod: now, priority: 0.7, freq: 'weekly' });
});
games.forEach(g => {
  urls.push({ loc: `${BASE}/arcade/${g.id}.html`, lastmod: now, priority: 0.6, freq: 'monthly' });
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap, 'utf8');

// --- robots.txt ---
const robots = `# smq-v3 robots
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin

Sitemap: ${BASE}/sitemap.xml
Sitemap: ${BASE}/rss.xml
`;
fs.writeFileSync(path.join(OUT, 'robots.txt'), robots, 'utf8');

// --- rss.xml ---
const pubDate = new Date().toUTCString();
const items = [];
tools.filter(t => t.category === 'ai_games').slice(0, 20).forEach(t => {
  const title = t.name?.zh?.title || t.slug;
  const pain = t.name?.zh?.pain || '';
  items.push(`    <item>
      <title>${title}</title>
      <link>${BASE}/tool/${t.slug}</link>
      <guid>${BASE}/tool/${t.slug}</guid>
      <description>${pain} — 在线小工具，免费试用。${title} 解决你的具体痛点。</description>
      <pubDate>${pubDate}</pubDate>
    </item>`);
});
games.slice(0, 20).forEach(g => {
  const title = g.title || g.id;
  const pain = g.pain || '';
  items.push(`    <item>
      <title>${title} — 街机小游戏</title>
      <link>${BASE}/arcade/${g.id}.html</link>
      <guid>${BASE}/arcade/${g.id}.html</guid>
      <description>${pain} — ${g.engineName} 引擎 + ${g.theme} 题材，每游戏免费玩 10 分钟。</description>
      <pubDate>${pubDate}</pubDate>
    </item>`);
});
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>smq-v3 痛点工具箱 &amp; 街机游戏中心</title>
    <link>${BASE}</link>
    <description>520+ 在线小工具 + 1000+ 街机小游戏，AI 娱乐中心。每工具免费试用 10 次，订阅解锁全部。</description>
    <language>zh-cn</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>
`;
fs.writeFileSync(path.join(OUT, 'rss.xml'), rss, 'utf8');

console.log('SEO files generated:', fs.readdirSync(OUT).filter(f => /sitemap|robots|rss/.test(f)).join(', '));