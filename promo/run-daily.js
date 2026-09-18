// promo/run-daily.js - 每日推广自动化入口（本机 cron / GitHub Actions 定时调用）
// 步骤: 1) 生成小批量 campaign  2) 构建当日分发清单  3) 执行分发
// 用法: node promo/run-daily.js [--webhook URL] [--arcade 3 --tools 3]
require('../lib/env').ensureEnv('.env');
const promoter = require('./promoter');
const store = require('./store');

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function main() {
  const arcadeN = Number(arg('arcade', 3));
  const toolsN = Number(arg('tools', 3));
  const webhook = arg('webhook', process.env.PROMO_WEBHOOK_URL);

  console.log('=== Okara 每日推广自动化 ===');
  console.log('时间:', new Date().toISOString());

  console.log(`\n[1/3] 生成 campaign (arcade=${arcadeN} tools=${toolsN} x zh/en/ar x twitter/xiaohongshu) ...`);
  const campaign = await promoter.generateCampaign({ arcadeN, toolsN, langs: ['zh', 'en', 'ar'], platforms: ['twitter', 'xiaohongshu'] });
  console.log('campaign:', campaign.campaignId, '| posts:', campaign.posts.length);

  console.log('\n[2/3] 构建当日分发清单 ...');
  const date = new Date().toISOString().slice(0, 10);
  const plan = promoter.buildDispatchPlan(date, 3);
  console.log('plan:', plan.length, 'posts for', date);

  console.log('\n[3/3] 执行分发' + (webhook ? ' (webhook)' : ' (local mark)') + ' ...');
  const result = await promoter.runDispatcher();
  const done = result.dispatched.filter(r => r.delivered).length;
  console.log('dispatched:', done + '/' + result.dispatched.length);

  const stats = store.get('stats') || {};
  console.log('\n=== 累计统计 ===');
  console.log(JSON.stringify({ generated: stats.generated, published: stats.published, clicks: stats.clicks }, null, 1));

  // 写入当日台账（供周报聚合，跨进程持久）
  try {
    const { captureDay } = require('../report/daily');
    const day = captureDay({ arcade: arcadeN, tools: toolsN, dispatched: done });
    console.log('台账已记录:', day.date);
  } catch (e) {
    console.log('台账记录失败(忽略):', e.message);
  }

  // 输出摘要样例
  const recent = store.get('feed') || [];
  const last = recent[recent.length - 1];
  if (last && last.posts.length) {
    console.log('\n=== 示例帖(第一条) ===');
    console.log(last.posts[0].content);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error('ERROR:', e.message); process.exit(1); });