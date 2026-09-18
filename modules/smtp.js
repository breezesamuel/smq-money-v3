// modules/smtp.js - 零依赖纯 Node SMTP 客户端（QQ/163/Gmail 465 SSL / 587 STARTTLS）
// 用法: const { sendMail } = require('./modules/smtp');
//       await sendMail({ to:'a@x.com', subject:'...', text:'...', html:'...' });
// 凭据从环境变量读取: SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS (授权码)
const net = require('net');
const tls = require('tls');

function conf() {
  return {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || ''
  };
}

function base64(s) { return Buffer.from(s, 'utf8').toString('base64'); }

class SmtpClient {
  constructor(c) {
    this.c = c;
    this.buffer = '';
    this.waiters = [];
    this.dead = false;
  }
  connect() {
    return new Promise((resolve, reject) => {
      const sock = this.c.port === 465
        ? tls.connect({ host: this.c.host, port: this.c.port, rejectUnauthorized: false })
        : net.connect(this.c.port, this.c.host);
      this.sock = sock;
      sock.setEncoding('utf8');
      sock.on('data', d => this.onData(d));
      sock.on('error', reject);
      sock.on('close', () => { this.dead = true; });
      sock.on('connect', () => resolve());
    });
  }
  onData(d) {
    this.buffer += d;
    let idx;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).replace(/\r$/, '');
      this.buffer = this.buffer.slice(idx + 1);
      const m = line.match(/^(\d{3})(\s?)-\u0001?/);
      // 完整响应行: 三位码 + 空格 + 文本
      const full = /^(\d{3}) (.+)$/.exec(line);
      const cont = /^(\d{3})-(.+)$/.exec(line);
      if (full) {
        const w = this.waiters.shift();
        if (w) { clearTimeout(w.t); w.resolve({ code: Number(full[1]), text: full[2] }); }
      } else if (!cont) {
        const w = this.waiters.shift();
        if (w) { clearTimeout(w.t); w.resolve({ code: Number(m ? m[1] : -1), text: line }); }
      }
    }
  }
  cmd(line) {
    return new Promise((resolve, reject) => {
      if (this.dead) return reject(new Error('SMTP socket closed'));
      this.waiters.push({ resolve, reject, t: setTimeout(() => reject(new Error('SMTP timeout after: ' + line.slice(0, 40))), 20000) });
      this.sock.write(line + '\r\n');
    });
  }
  writeRaw(str) {
    return new Promise((resolve, reject) => {
      if (this.dead) return reject(new Error('SMTP socket closed'));
      this.sock.write(str, err => err ? reject(err) : resolve());
    });
  }
  waitReply(ms = 30000) {
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject, t: setTimeout(() => reject(new Error('SMTP waitReply timeout')), ms) });
    });
  }
  close() { try { this.sock.destroy(); } catch (e) {} }
}

async function sendMail(opts, overrides = {}) {
  const c = Object.assign(conf(), overrides);
  if (!c.host || !c.user || !c.pass) {
    const err = new Error('SMTP 未配置: 需要 SMTP_HOST/SMTP_USER/SMTP_PASS(授权码)');
    err.code = 'SMTP_UNCONFIGURED';
    throw err;
  }
  const client = new SmtpClient(c);
  await client.connect();
  if (client.c.port !== 465) {
    await client.waitReply();          // banner
    await client.cmd('EHLO smq');
    await client.cmd('STARTTLS');
    await new Promise((resolve, reject) => {
      const s = tls.connect({ socket: client.sock, rejectUnauthorized: false });
      s.setEncoding('utf8');
      s.on('data', d => client.onData(d));
      s.on('error', reject);
      s.on('secureConnect', () => { client.sock = s; resolve(); });
    });
    await client.cmd('EHLO smq');
  } else {
    await client.waitReply();          // banner
    await client.cmd('EHLO smq');
  }

  await client.cmd('AUTH LOGIN');
  await client.cmd(base64(c.user));
  const authRes = await client.cmd(base64(c.pass));

  const from = c.from || c.user;
  await client.cmd('MAIL FROM:<' + from + '>');
  const toList = Array.isArray(opts.to) ? opts.to : [opts.to];
  for (const t of toList) await client.cmd('RCPT TO:<' + t.trim() + '>');
  await client.cmd('DATA');

  const boundary = '=_smq_' + Date.now().toString(36);
  const html = opts.html ? '<html><body>' + opts.html + '</body></html>' : null;
  let payload = 'From: <' + from + '>\r\n';
  payload += 'To: ' + toList.join(', ') + '\r\n';
  payload += 'Subject: ' + (opts.subject || '').replace(/[\r\n]/g, ' ') + '\r\n';
  payload += 'MIME-Version: 1.0\r\n';
  payload += 'Content-Type: multipart/alternative; boundary="' + boundary + '"\r\n';
  payload += '\r\n';
  payload += '--' + boundary + '\r\n';
  payload += 'Content-Type: text/plain; charset=utf-8\r\n\r\n' + (opts.text || '') + '\r\n';
  if (html) {
    payload += '--' + boundary + '\r\n';
    payload += 'Content-Type: text/html; charset=utf-8\r\n\r\n' + html + '\r\n';
  }
  payload += '--' + boundary + '--\r\n';
  payload += '.';

  await client.writeRaw(payload + '\r\n.\r\n');
  const okRes = await client.waitReply(40000);
  await client.cmd('QUIT').catch(() => {});
  client.close();
  return { ok: true, to: toList, authCode: authRes.code, authText: authRes.text, deliverCode: okRes.code };
}

module.exports = { sendMail, conf };