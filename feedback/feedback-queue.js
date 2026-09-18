// feedback/feedback-queue.js - 用户反馈收集
// 写盘 feedback/feedback.json（本地持久）；Serverless 只读时降级为 SMTP 邮件通知。
// 兜底：无论是否写盘成功，均尝试异步发送管理员通知邮件（失败静默）。
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const FILE = path.join(DIR, 'feedback.json');
const MAX = 500;

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return []; }
}

function write(list) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch (e) { return false; }
}

function notify(rec) {
  try {
    const smtp = require('../modules/smtp');
    const to = (process.env.MONITOR_EMAILS || '460123249@qq.com').split(/[,;]/).map(x => x.trim()).filter(Boolean);
    if (!to.length || !process.env.SMTP_PASS) return;
    const typeLabel = { pain: '痛点', suggestion: '建议', bug: '报错', other: '其他' }[rec.type] || rec.type;
    const pageTag = rec.pageTitle || rec.page || 'unknown';
    smtp.sendMail({
      to, subject: `[SMQ] 新反馈 ${typeLabel}：${String(rec.pageTitle || rec.page || 'unknown').slice(0, 40)}`,
      text: [
        `新用户反馈`,
        `类型: ${typeLabel}`,
        `页面: ${rec.page} (${rec.pageTitle})`,
        `语言: ${rec.lang}`,
        `联系方式: ${rec.contact || '-'}`,
        `内容: ${rec.message}`,
        `时间: ${rec.createdAt}`
      ].join('\n')
    }).catch(() => {});
  } catch (e) { /* 无 SMTP 配置时忽略 */ }
}

function addFeedback(rec) {
  const list = read();
  list.push(rec);
  const trimmed = list.length > MAX ? list.slice(-MAX) : list;
  const saved = trimmed !== list ? write(trimmed) : write(list);
  notify(rec);
  return saved;
}

function listFeedback() { return read(); }

module.exports = { addFeedback, listFeedback, FILE, MAX };