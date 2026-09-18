// promo/store.js - 推广模块轻量 KV 存储（JSON 文件持久化；预留 Supabase 后端）
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'promo-state.json');

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    cache = { posts: {}, feed: [], counters: {}, stats: { generated: 0, published: 0, clicks: 0, conversions: 0 } };
  }
  return cache;
}

function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), 'utf8');
    return true;
  } catch (e) { return false; }
}

function get(key) {
  const d = load();
  const parts = key.split('.');
  let cur = d;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function set(key, value) {
  const d = load();
  const parts = key.split('.');
  let cur = d;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
  return save();
}

module.exports = { get, set, load, save, DATA_FILE };