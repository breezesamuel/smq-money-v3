// api/store.js - 轻量 KV 持久化
// Supabase(表 public.kv) 优先；未配置 SUPABASE_URL/ANON_KEY 时纯内存回退（性能与现行为完全一致）。
// 用法: const { kvGet, kvSet, ready } = require('./store')
const memory = new Map();

function ready() {
  try { return require('./supabase').isSupabaseReady(); } catch (e) { return false; }
}

function client() {
  return require('./supabase').getClient();
}

// 读: kvGet('user:xxx') -> value | null（内存命中优先，避免重复请求；内存也无时查库）
async function kvGet(key) {
  if (memory.has(key)) return memory.get(key);
  if (!ready()) return null;
  try {
    const c = client();
    const url = `${c.url}/rest/v1/kv?select=value&key=eq.${encodeURIComponent(key)}`;
    const r = await fetch(url, { headers: { apikey: c.key, Authorization: 'Bearer ' + c.key } });
    if (r.status !== 200) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) return null;
    const v = rows[0].value;
    memory.set(key, v);
    return v;
  } catch (e) { return null; }
}

// 写（内存总是写；Supabase 用 upsert）：失败静默，不影响主流程
async function kvSet(key, value) {
  memory.set(key, value);
  if (!ready()) return { ok: true, persisted: false };
  try {
    const c = client();
    const url = `${c.url}/rest/v1/kv`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: c.key, Authorization: 'Bearer ' + c.key,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
    });
    return { ok: r.status >= 200 && r.status < 300, persisted: r.status >= 200 && r.status < 300, status: r.status };
  } catch (e) { return { ok: false, persisted: false, error: e.message }; }
}

module.exports = { kvGet, kvSet, ready, memory };