// 支付网关：优先真实收款（Base USDC 链上 + MoltsPay），未配置密钥时回退演示模式
const https = require('https');
const crypto = require('crypto');
const path = require('path');
const { ensureEnv } = require('../lib/env');

// 加载 .env（本地运行/测试时使用；Vercel 上由平台注入环境变量）
ensureEnv();

function env(name) { return process.env[name] || ''; }

const PAYMENT_CONFIG = {
  mode: env('PAYMENT_MODE') || 'auto', // auto | live | demo
  providers: {
    moltspay: { apiKey: env('MOLTSPAY_API_KEY'), secret: env('MOLTSPAY_SECRET'), active: !!(env('MOLTSPAY_API_KEY') && env('MOLTSPAY_SECRET')) },
    moltjobs: { apiKey: env('MOLTJOB_API_KEY'), active: !!env('MOLTJOB_API_KEY') },
    alipay: { appId: env('ALIPAY_APP_ID') || env('MOLLIE_MERCHANT_APP_ID'), account: env('ALIPAY_ACCOUNT'), active: !!(env('ALIPAY_APP_ID') || env('MOLLIE_MERCHANT_APP_ID')) },
    paypal: { clientId: env('PAYPAL_CLIENT_ID'), secret: env('PAYPAL_SECRET'), active: !!(env('PAYPAL_CLIENT_ID') && env('PAYPAL_SECRET')) },
    onchain: { baseUSDC: env('WALLET_BASE_USDC'), direct: env('WALLET_EVM_DIRECT'), payment: env('WALLET_PAYMENT'), receive: env('WALLET_RECEIVE'), solana: env('WALLET_SOLANA'), active: !!env('WALLET_PAYMENT') }
  }
};

function postJSON(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers }
    }, res => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(raw || '{}') }); } catch { resolve({ status: res.statusCode, data: raw }); } });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    req.write(body); req.end();
  });
}

function signMoltsPay(payload, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

// 尝试真实创建订单。返回 { live, provider, orderId, payUrl, qrUrl, message }
async function createLiveOrder({ toolId, toolName, amountCNY, type, deviceId }) {
  const errors = [];

  // 0) 支付宝（中国用户主流，RSA2 签名真实下单）
  try {
    const alipay = require('./alipay');
    if (alipay.ready()) {
      const outTradeNo = 't' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);
      const r = await alipay.createTradeOrder({ outTradeNo, subject: toolName, totalAmount: amountCNY, type, deviceId, toolId });
      if (r.ok && r.url) {
        return { live: true, provider: 'alipay', orderId: outTradeNo, payUrl: r.url, qrUrl: r.url, message: '支付宝收银台（跳转支付）' };
      }
      errors.push('alipay:' + (r.error || 'no url'));
    }
  } catch (e) { errors.push('alipay:' + e.message); }

  // 1) MoltsPay（若有服务端订单 API）
  if (PAYMENT_CONFIG.providers.moltspay.active && env('MOLTSPAY_REST_URL')) {
    try {
      const payload = { amount: amountCNY * 100, currency: 'CNY', description: toolName, orderId: `t${Date.now()}`, deviceId };
      const sig = signMoltsPay(payload, PAYMENT_CONFIG.providers.moltspay.secret);
      const r = await postJSON(env('MOLTSPAY_REST_URL'), payload, { 'Authorization': `Bearer ${PAYMENT_CONFIG.providers.moltspay.apiKey}`, 'X-Signature': sig });
      if (r.data && (r.data.orderId || r.data.payUrl)) {
        return { live: true, provider: 'moltspay', orderId: r.data.orderId, payUrl: r.data.payUrl || null, qrUrl: r.data.qrUrl || null };
      }
      errors.push('moltspay:' + JSON.stringify(r.data).slice(0, 120));
    } catch (e) { errors.push('moltspay:' + e.message); }
  }

  // 2) 链上 Base USDC 收款二维码（真实可收款，支持任意钱包 QR）
  if (PAYMENT_CONFIG.providers.onchain.active) {
    const amountUSDC = Math.round((amountCNY * 100) / 725) / 100; // CNY -> USDC @7.25
    const qrData = ['ethereum:', PAYMENT_CONFIG.providers.onchain.payment].join('');
    return {
      live: true, provider: 'onchain_usdc_base',
      orderId: 'pay_' + Date.now().toString(36).toUpperCase(),
      amountUSDC, chain: 'Base',
      payUrl: `https://app.uniswap.org/swap?chain=base&outputCurrency=${PAYMENT_CONFIG.providers.onchain.payment}&amount=${amountUSDC}`,
      qrCode: qrData,
      address: PAYMENT_CONFIG.providers.onchain.payment,
      message: '扫码或转账 USDC on Base 到收款地址（等值 CNY）'
    };
  }

  // 3) PayPal（naive 下单）
  if (PAYMENT_CONFIG.providers.paypal.active && env('PAYPAL_REST_URL')) {
    try {
      const auth = Buffer.from(`${PAYMENT_CONFIG.providers.paypal.clientId}:${PAYMENT_CONFIG.providers.paypal.secret}`).toString('base64');
      const r = await postJSON(env('PAYPAL_REST_URL') || 'https://api-m.paypal.com/v1/oauth2/token', 'grant_type=client_credentials', { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' });
      const token = r.data.access_token;
      if (token) {
        const o = await postJSON('https://api-m.paypal.com/v2/checkout/orders', {
          intent: 'CAPTURE',
          purchase_units: [{ amount: { currency_code: 'USD', value: (amountCNY / 7.25).toFixed(2) }, description: toolName }]
        }, { 'Authorization': `Bearer ${token}` });
        if (o.data && o.data.links) {
          const approve = o.data.links.find(l => l.rel === 'approve');
          return { live: true, provider: 'paypal', orderId: o.data.id, payUrl: approve ? approve.href : null };
        }
      }
      errors.push('paypal:no-token');
    } catch (e) { errors.push('paypal:' + e.message); }
  }

  return { live: false, errors };
}

function paymentProviderStatus() {
  const p = PAYMENT_CONFIG.providers;
  return {
    mode: PAYMENT_CONFIG.mode,
    providers: {
      moltspay: p.moltspay.active ? 'configured' : 'unconfigured',
      moltjobs: p.moltjobs.active ? 'configured' : 'unconfigured',
      alipay: p.alipay.active ? 'configured' : 'unconfigured',
      paypal: p.paypal.active ? 'configured' : 'unconfigured',
      onchain_usdc_base: p.onchain.active ? 'configured' : 'unconfigured'
    },
    wallets: { baseUSDC: p.onchain.baseUSDC, payment: p.onchain.payment, receive: p.onchain.receive, solana: p.onchain.solana }
  };
}

module.exports = { createLiveOrder, paymentProviderStatus, PAYMENT_CONFIG };