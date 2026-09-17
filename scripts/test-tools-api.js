const http = require('http');
const handler = require('../api/index');
const { loadTools } = require('../api/lib');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: 8899, path, method, headers: { 'Content-Type': 'application/json' } }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const server = http.createServer((req, res) => {
  const expressLikeRes = {
    status: c => { res.statusCode = c; return expressLikeRes; },
    setHeader: (k, v) => res.setHeader(k, v),
    json: o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); },
    send: s => res.end(s)
  };
  handler(req, expressLikeRes, () => {});
});

(async () => {
  await new Promise(r => server.listen(8899, r));
  console.log('=== 测试工具 API ===\n');

  const tools = await request('GET', '/api/tools');
  console.log(`[${tools.status}] 工具列表: total=${tools.body.total} categories=${Object.keys(tools.body.categories).length}`);

  const cat = await request('GET', '/api/tools?category=worker&per=5');
  console.log(`[${cat.status}] worker工具: ${cat.body.tools.length} 条, 第一条: ${cat.body.tools[0].name.title}`);

  const detail = await request('GET', `/api/tools/${tools.body.tools[0].id}`);
  console.log(`[${detail.status}] 详情: ${detail.body.name.zh ? '三语完整' : 'MISSING zh'} | pricing: ${detail.body.pricing.monthly}元/月, ${detail.body.pricing.lifetime}元买断`);

  const pricing = await request('GET', '/api/pricing');
  console.log(`[${pricing.status}] 返佣规则: ${JSON.stringify(pricing.body.referral)}`);

  const user = await request('POST', '/api/user', { deviceId: 'test-device-001' });
  console.log(`[${user.status}] 用户: code=${user.body.user.referralCode}`);

  const before = await request('POST', '/api/check', { deviceId: 'test-device-001', toolId: tools.body.tools[0].id });
  console.log(`[${before.status}] 检查免费次数: ${before.body.reason} remaining=${before.body.remaining}`);

  for (let i = 0; i < 11; i++) { await request('POST', '/api/use', { deviceId: 'test-device-001', toolId: tools.body.tools[0].id }); }
  const after = await request('POST', '/api/check', { deviceId: 'test-device-001', toolId: tools.body.tools[0].id });
  console.log(`[${after.status}] 用11次后: ${after.body.reason} pricing=${after.body.pricing && after.body.pricing.monthly}元/月`);

  const pay = await request('POST', '/api/pay', { deviceId: 'test-device-001', toolId: tools.body.tools[0].id, type: 'lifetime' });
  console.log(`[${pay.status}] 发起支付: 订单=${pay.body.orderId} 金额=${pay.body.amount}元`);

  const confirm = await request('POST', '/api/pay/confirm', { deviceId: 'test-device-001', toolId: tools.body.tools[0].id, type: 'lifetime' });
  console.log(`[${confirm.status}] 确认支付: ${confirm.body.license}`);

  const ref = await request('GET', '/api/referral?deviceId=test-device-001');
  console.log(`[${ref.status}] 推荐进度: friends=${ref.body.verifiedFriends} code=${ref.body.referralCode}`);

  const health = await request('GET', '/api/health');
  console.log(`[${health.status}] 健康: tools=${health.body.tools}`);

  console.log('\n✅ API 全部测试完成');
  server.close();
  process.exit(0);
})().catch(e => { console.error('测试失败:', e); process.exit(1); });