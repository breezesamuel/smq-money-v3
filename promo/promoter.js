// promo/promoter.js - 推广内容工厂 + 分发管线
// 从 arcade 数据 / tools 数据采样素材 -> Okara 批量生成 -> 存内容库 -> 产出当日分发清单
const fs = require('fs');
const path = require('path');
const { generatePost, batchGenerate } = require('./okara');
const store = require('./store');
const { track } = require('../report/analytics');

const ROOT = path.join(__dirname, '..');

function pick(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function loadArcade(n = 20) {
  try { return pick(require(path.join(ROOT, 'arcade-data.js')), n); }
  catch (e) { return []; }
}

function loadTools(n = 20) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools-data', 'tools.json'), 'utf8'));
    const arr = (d.tools || []).slice(0, n).map(t => ({
      slug: t.slug,
      title: t.name?.zh?.title || t.slug,
      pain: t.name?.zh?.pain || '',
      category: t.category
    }));
    return arr;
  } catch (e) { return []; }
}

function mixMaterials(arcadeN = 6, toolsN = 4) {
  const games = loadArcade(arcadeN + toolsN).map(g => ({
    slug: g.id + '.html',
    title: g.title || g.id,
    pain: g.pain || g.theme || '',
    category: 'arcade',
    engineName: g.engineName,
    theme: g.theme
  }));
  const tools = loadTools(toolsN).map(t => ({ ...t, category: 'ai_tool' }));
  return [...games.slice(0, arcadeN), ...tools];
}

// 生成一批(默认 6 素材 × 3 语言 × 2 平台 = 36 帖，可调小成本)
async function generateCampaign(opts = {}) {
  const materials = opts.materials || mixMaterials(opts.arcadeN || 3, opts.toolsN || 3);
  const langs = opts.langs || ['zh', 'en', 'ar'];
  const platforms = opts.platforms || ['twitter', 'xiaohongshu'];
  const personas = ['game_boy', 'productivity_hack'];

  const allPosts = [];
  for (const m of materials) {
    for (const lang of langs) {
      for (const platform of platforms) {
        const persona = m.category === 'ai_tool' ? 'productivity_hack' : pick(personas);
        try {
          const post = await generatePost(m, { lang, platform, persona });
          if (post.postId !== 'FAIL') allPosts.push(post);
        } catch (e) { /* skip */ }
      }
    }
  }

  const campaignId = 'CAM_' + Date.now().toString(36).toUpperCase();
  const campaign = {
    campaignId,
    createdAt: new Date().toISOString(),
    counts: { materials: materials.length, posts: allPosts.length },
    posts: allPosts
  };
  const prev = store.get('feed') || [];
  store.set('feed', [...prev, campaign]);
  const stats = store.get('stats') || { generated: 0, published: 0, clicks: 0, conversions: 0 };
  stats.generated += allPosts.length;
  store.set('stats', stats);
  return campaign;
}

// 生成"当日分发清单"：从最近 campaign 里挑出待发帖
function buildDispatchPlan(dateStr, maxPerPlatform = 3) {
  const feed = store.get('feed') || [];
  const recent = feed.length ? feed[feed.length - 1].posts : [];
  const published = store.get('published') || [];
  const publishedIds = new Set(published.map(p => p.postId));

  const plan = [];
  const byPlatform = {};
  for (const post of recent) {
    if (publishedIds.has(post.postId)) continue;
    if (plan.length >= maxPerPlatform * 4) break;
    byPlatform[post.platform] = byPlatform[post.platform] || 0;
    if (byPlatform[post.platform] >= maxPerPlatform) continue;
    byPlatform[post.platform]++;
    plan.push({ ...post, dueDate: dateStr });
  }
  store.set('dispatchPlan', plan);
  return plan;
}

// 标记已发布（模拟/对接 webhook 后回调）
function markPublished(postIds) {
  const published = store.get('published') || [];
  const ids = Array.isArray(postIds) ? postIds : [postIds];
  for (const id of ids) {
    if (!published.some(p => p.postId === id)) published.push({ postId: id, publishedAt: new Date().toISOString() });
  }
  store.set('published', published);
  const stats = store.get('stats') || { generated: 0, published: 0, clicks: 0, conversions: 0 };
  stats.published = published.length;
  store.set('stats', stats);
  return { marked: ids.length };
}

// 追踪点击/转化（?ref=POSTID 回流）
function trackClick(postId) {
  const stats = store.get('stats') || { generated: 0, published: 0, clicks: 0, conversions: 0 };
  stats.clicks++;
  store.set('stats', stats);
  const clicks = store.get('clicks') || {};
  clicks[postId] = (clicks[postId] || 0) + 1;
  store.set('clicks', clicks);
  track('promoClick', { detail: { clickByPost: { [postId]: 1 } } });
  return { postId, clicks: clicks[postId] };
}

// 分发处理器：对每个待发帖，若配置了 webhook 则 POST 出去；否则本地标记
async function runDispatcher() {
  const plan = store.get('dispatchPlan') || [];
  const webhook = process.env.PROMO_WEBHOOK_URL;
  const results = [];
  for (const post of plan.slice(0, 10)) {
    if (webhook) {
      try {
        const res = await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'okara_post', platform: post.platform, post })
        });
        results.push({ postId: post.postId, delivered: res.ok });
      } catch (e) {
        results.push({ postId: post.postId, delivered: false, error: e.message });
      }
    } else {
      results.push({ postId: post.postId, delivered: true, mode: 'local_mark' });
    }
  }
  markPublished(results.filter(r => r.delivered).map(r => r.postId));
  track('promoDispatched', { amount: results.filter(r => r.delivered).length });
  return { dispatched: results };
}

module.exports = {
  mixMaterials, generateCampaign, buildDispatchPlan, markPublished,
  trackClick, runDispatcher
};