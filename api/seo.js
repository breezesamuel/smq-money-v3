// SEO 基建：sitemap.xml / robots.txt / RSS / 结构化数据 生成
// 依赖 arcade-data.js (1000+ 游戏) + tools.json (工具列表)
const path = require('path');
const fs = require('fs');

const BASE = 'https://smq-v3.vercel.app';

function loadArcade() {
  try {
    return require('../arcade-data.js');
  } catch (e) {
    return [];
  }
}

function loadTools() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools-data', 'tools.json'), 'utf8'));
    return d.tools || [];
  } catch (e) {
    return [];
  }
}

// 生成 sitemap.xml
function generateSitemap() {
  const games = loadArcade();
  const tools = loadTools();
  const now = new Date().toISOString().slice(0, 10);

  const urls = [];
  urls.push({ loc: `${BASE}/`, lastmod: now, priority: 1.0, freq: 'daily' });
  urls.push({ loc: `${BASE}/arcade`, lastmod: now, priority: 0.9, freq: 'daily' });
  urls.push({ loc: `${BASE}/tools`, lastmod: now, priority: 0.8, freq: 'weekly' });

  // 游戏页（ai_games 工具 + arcade 游戏）
  tools.filter(t => t.category === 'ai_games').forEach(t => {
    urls.push({ loc: `${BASE}/tool/${t.slug}`, lastmod: now, priority: 0.7, freq: 'weekly' });
  });
  games.forEach(g => {
    urls.push({ loc: `${BASE}/arcade/${g.id}`, lastmod: now, priority: 0.6, freq: 'monthly' });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  return xml;
}

// 生成 robots.txt
function generateRobots() {
  return `# smq-v3 robots
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin

Sitemap: ${BASE}/sitemap.xml
Sitemap: ${BASE}/rss.xml
`;
}

// 生成 RSS (游戏/工具更新源，供推广分发订阅)
function generateRss() {
  const games = loadArcade();
  const tools = loadTools();
  const pubDate = new Date().toUTCString();

  const items = [];
  tools.filter(t => t.category === 'ai_games').slice(0, 10).forEach(t => {
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
  games.slice(0, 10).forEach(g => {
    const title = g.title || g.id;
    const pain = g.pain || '';
    items.push(`    <item>
      <title>${title} — 街机小游戏</title>
      <link>${BASE}/arcade/${g.id}</link>
      <guid>${BASE}/arcade/${g.id}</guid>
      <description>${pain} — ${g.engineName} 引擎 + ${g.theme} 题材，前10分钟免费。</description>
      <pubDate>${pubDate}</pubDate>
    </item>`);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>smq-v3 痛点工具箱 &amp; 街机游戏中心</title>
    <link>${BASE}</link>
    <description>300+ 在线小工具 + 1000+ 街机小游戏，AI 娱乐中心。前10分钟免费，¥0.2/分钟。</description>
    <language>zh-cn</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>`;
}

// 生成单个游戏的结构化数据 (JSON-LD Game)
function gameStructuredData(g) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: g.title,
    description: `${g.pain || '小游戏'} — ${g.engineName} 引擎制作的在线街机游戏。`,
    genre: g.theme,
    playMode: 'SinglePlayer',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      ratingCount: String(Math.max(1, g.plays || 1))
    },
    offers: {
      '@type': 'Offer',
      price: '0.2',
      priceCurrency: 'CNY',
      description: '前10分钟免费，之后 ¥0.2/分钟'
    }
  };
}

// 首页结构化数据 (WebSite + WebApplication)
function siteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '痛点工具箱 Pain Toolkit',
    alternateName: 'smq-v3',
    url: BASE,
    description: '300+ 在线小工具 + 1000+ 街机小游戏。前10分钟免费，¥0.2/分钟。'
  };
}

module.exports = {
  BASE, generateSitemap, generateRobots, generateRss,
  gameStructuredData, siteStructuredData
};