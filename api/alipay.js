// api/alipay.js - 支付宝开放平台真实对接（RSA2 签名，alipay.trade.wap.pay 手机网站支付）
// 依赖 .env: ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY(支付宝宝钥,未配则只签名不验签) / ALIPAY_ACCOUNT
const crypto = require('crypto');
const https = require('https');
const { ensureEnv } = require('../lib/env');
ensureEnv();

function env(n) { return process.env[n] || ''; }

const CONFIG = {
  appId: env('ALIPAY_APP_ID'),
  gateway: env('ALIPAY_GATEWAY') || 'https://openapi.alipay.com/gateway.do',
  privateKey: (env('ALIPAY_PRIVATE_KEY') || '').replace(/\\n/g, '\n'),
  publicKey: (env('ALIPAY_PUBLIC_KEY') || '').replace(/\\n/g, '\n'), // 支付宝公钥（验签用）
  account: env('ALIPAY_ACCOUNT'),
  notifyUrl: env('ALIPAY_NOTIFY_URL') || 'https://smq-v3.vercel.app/api/alipay/notify',
  returnUrl: env('ALIPAY_RETURN_URL') || 'https://smq-v3.vercel.app/paid.html'
};

function ready() { return !!(CONFIG.appId && CONFIG.privateKey); }

// 字典序排序并串接
function buildSignContent(params) {
  const keys = Object.keys(params).sort();
  return keys.map(k => `${k}=${params[k]}`).join('&');
}

// RSA2 签名 (SHA256withRSA)
function sign(params) {
  const content = buildSignContent(params);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(content, 'utf8');
  return signer.sign({ key: CONFIG.privateKey, padding: crypto.constants.RSA_PKCS1_PADDING }, 'base64');
}

// 验签（通知/同步返回）
function verify(params, signature) {
  if (!CONFIG.publicKey) return true; // 未配支付宝公钥时跳过
  const content = buildSignContent(params);
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(content, 'utf8');
  return verifier.verify({ key: CONFIG.publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, signature, 'base64');
}

// 组装请求参数 + 签名
function buildRequest(bizContent, method) {
  const params = {
    app_id: CONFIG.appId,
    method,
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: new Date().toISOString().replace(/\.\d+Z$/, '+08:00').replace('T', ' '),
    version: '1.0',
    biz_content: JSON.stringify(bizContent),
    notify_url: CONFIG.notifyUrl,
    return_url: CONFIG.returnUrl
  };
  if (CONFIG.account) params.seller_id = CONFIG.account;
  params.sign = sign(params);
  return params;
}

// 发起 gateway.do HTTP 请求（GET/POST form-encoded）
function callGateway(params, method = 'GET') {
  return new Promise((resolve, reject) => {
    const u = new URL(CONFIG.gateway);
    const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + (method === 'GET' ? ('?' + qs) : ''),
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(qs) } : {}
    }, res => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(raw), raw }); }
        catch { resolve({ status: res.statusCode, data: null, raw }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('gateway timeout')));
    if (method === 'POST') req.write(qs);
    req.end();
  });
}

// 创建付款订单（手机网站支付/电脑网站回退）-> 返回跳转 URL
async function createTradeOrder({ outTradeNo, subject, totalAmount, type, deviceId, toolId, notifyUrl }) {
  if (!ready()) return { ok: false, error: 'alipay not configured (missing APP_ID or PRIVATE_KEY)' };
  const method = 'alipay.trade.wap.pay';
  const biz = {
    out_trade_no: outTradeNo,
    total_amount: Number(totalAmount).toFixed(2),
    subject: subject.slice(0, 200),
    product_code: 'QUICK_WAP_PAY',
    timeout_express: '2h',
    passback_params: Buffer.from(JSON.stringify({ deviceId, type, toolId })).toString('base64'),
    quit_url: CONFIG.returnUrl
  };
  const params = buildRequest(biz, method);
  const url = CONFIG.gateway + '?' + Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return { ok: true, method, url, params: { outTradeNo }, qrUrl: url };
}

// 支付宝账单查询（用于 pay/confirm 人工或自动核验）
async function queryTrade(outTradeNo) {
  const method = 'alipay.trade.query';
  const params = buildRequest({ out_trade_no: outTradeNo, query_options: ['trade_status'] }, method);
  const r = await callGateway(params, 'POST');
  if (r.data) {
    const resp = r.data['alipay_trade_query_response'] || {};
    if (resp || r.data.error_response) return { ok: true, status: resp.trade_status || 'QUERY_FAILED', tradeNo: resp.trade_no || null, amount: resp.total_amount || null, raw: r.data };
  }
  return { ok: false, error: 'gateway no data', raw: r.raw };
}

// 从 gateway 回调验签
function parseNotifyForm(body) {
  const out = {};
  if (!body) return out;
  const pairs = String(body).split('&');
  for (const p of pairs) {
    const i = p.indexOf('=');
    if (i < 0) continue;
    out[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)).replace(/\+/g, ' ');
  }
  return out;
}

module.exports = {
  CONFIG, ready, sign, verify, buildRequest, callGateway,
  createTradeOrder, queryTrade, parseNotifyForm, buildSignContent
};