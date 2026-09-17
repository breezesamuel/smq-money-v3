// Supabase 客户端单例
// 环境变量在 Vercel Dashboard -> Settings -> Environment Variables 配置：
//   SUPABASE_URL, SUPABASE_ANON_KEY
let client = null;

function getClient() {
  if (client) return client;
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) return null;
  // 轻量 fetch 封装，避免引入依赖
  client = {
    url: supabaseUrl,
    key: supabaseKey,
    async from(table) {
      return {
        table,
        select: async (cols = '*', filters = '') => {
          const r = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${cols}${filters}`, {
            headers: { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey }
          });
          return { data: r.status === 200 ? await r.json() : null, error: r.status !== 200 ? { message: 'supabase ' + r.status } : null };
        },
        insert: async (rows) => {
          const r = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
            method: 'POST', headers: { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey,
              'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify(rows)
          });
          return { data: r.status >= 200 && r.status < 300 ? await r.json() : null, error: r.status >= 300 ? { message: 'supabase ' + r.status } : null };
        }
      };
    }
  };
  return client;
}

module.exports = { getClient, isSupabaseReady: () => !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY };