// promo/fund.js - 5% 推广费基金（收入计提 → 自动投放预算池）
// 存放于 promo-state.json 的 fund 节点；Serverless 上写盘失败则静默降级为内存。
const store = require('./store');

const RATE = 0.05; // 收入 5%

function getFund() {
  return store.get('fund') || { balance: 0, totalAccrued: 0, totalSpent: 0, ledger: [] };
}

// 计提：一笔收入进账时按 RATE 计提推广费
function accrue(amountCNY, meta) {
  if (!(amountCNY > 0)) return { accrued: 0 };
  const f = getFund();
  const add = Math.round(amountCNY * RATE * 100) / 100;
  f.balance += add;
  f.totalAccrued = Math.round((f.totalAccrued + add) * 100) / 100;
  f.ledger.push({ type: 'accrue', amount: add, ref: meta && meta.ref, at: new Date().toISOString() });
  store.set('fund', f);
  return { accrued: add, balance: f.balance };
}

// 支出：自动投放/付费获客时从基金扣减
function spend(amountCNY, meta) {
  const f = getFund();
  const amt = Math.min(amountCNY, f.balance);
  f.balance = Math.round((f.balance - amt) * 100) / 100;
  f.totalSpent = Math.round((f.totalSpent + amt) * 100) / 100;
  f.ledger.push({ type: 'spend', amount: amt, ref: meta && meta.ref, at: new Date().toISOString() });
  store.set('fund', f);
  return { spent: amt, balance: f.balance };
}

function balance() {
  return getFund().balance;
}

module.exports = { accrue, spend, balance, RATE };