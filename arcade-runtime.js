// arcade-runtime.js - 街机游戏分钟计费运行时
// 规则：
//   每游戏前 10 分钟免费（deviceId 每游戏独立计时）
//   超过后 ¥0.2/分钟
//   邀请一个 AI → 双方 +10 分钟免费（每日最多 3 次/日）
// 存储：localStorage（平滑过渡到 Supabase/KV 时替换为 fetch）
(function () {
  if (window.__ARCADE_RT__) return;
  window.__ARCADE_RT__ = true;

  const API = '/api/pay';
  const LS_PREFIX = 'arcade_';
  const RULES = {
    freeMinutes: 10,
    pricePerMin: 0.2,
    inviteMinutes: 10,
    dailyInviteLimit: 3,
  };

  function getDeviceId() {
    let d = localStorage.getItem(LS_PREFIX + 'deviceId');
    if (!d) {
      d = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(LS_PREFIX + 'deviceId', d);
    }
    return d;
  }

  function storageKey(slug) {
    return LS_PREFIX + slug;
  }

  // 会话状态
  function getSession(slug) {
    try {
      const raw = localStorage.getItem(storageKey(slug));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveSession(slug, s) {
    localStorage.setItem(storageKey(slug), JSON.stringify(s));
  }

  // 调用计费 API（失败时降级到本地计时，不阻塞游戏）
  async function callPay(path, opts) {
    const dev = getDeviceId();
    try {
      const qs = new URLSearchParams({ deviceId: dev, ...(opts && opts.extra || {}) });
      const r = await fetch(`${API}/${path}?${qs}`, {
        method: (opts && opts.method) || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: (opts && opts.body) ? JSON.stringify(opts.body) : undefined,
      });
      return await r.json();
    } catch (e) {
      return { offline: true, deviceId: dev };
    }
  }

  const Arcade = {
    deviceId: getDeviceId(),
    rules: RULES,

    // 开始计时（首次打开某个游戏）
    start(slug) {
      let s = getSession(slug);
      if (!s) {
        s = { slug, startedAt: Date.now(), seconds: 0, mode: 'free', localPending: [] };
        saveSession(slug, s);
      }
      // 后台预热余额，失败不影响本地计时
      callPay('balance').then(b => { Arcade._lastBalance = b; });
      return s;
    },

    // 心跳：应当每秒调用一次（游戏帧循环中），本地累计秒数，
    // 积累满 60 秒（或跨过免费边界）时向计费 API 对齐。
    tick(slug) {
      const s = getSession(slug) || Arcade.start(slug);
      s.seconds += 1;
      s.elapsedMin = Math.floor(s.seconds / 60);
      const freeEnd = RULES.freeMinutes * 60;
      s.mode = s.seconds <= freeEnd ? 'free' : 'paid';
      saveSession(slug, s);

      // 每 60 秒触发一次心跳对齐
      if (s.seconds % 60 === 0) {
        Arcade._heartbeat(slug);
      }
      return { seconds: s.seconds, mode: s.mode };
    },

    async _heartbeat(slug) {
      const s = getSession(slug);
      if (!s) return;
      await callPay('heartbeat', { method: 'POST' }).then(h => {
        s.mode = (h && h.kind === 'paid') ? 'paid' : s.mode;
        if (h && h.freeRemaining !== undefined) Arcade._freeRemaining = h.freeRemaining;
        saveSession(slug, s);
      });
    },

    // 查询余额
    async balance() {
      return callPay('balance');
    },

    // 充值包
    async recharge(plan) {
      return callPay('recharge', { method: 'POST', body: { plan } });
    },

    // 邀请：传受邀者 deviceId（被邀请的 AI），双方 +10 分钟
    async invite(inviteeDeviceId) {
      return callPay('invite', { method: 'POST', body: { inviterId: inviteeDeviceId } });
    },

    // 当前计时信息（供 UI 展示）
    status(slug) {
      const s = getSession(slug);
      return s ? { seconds: s.seconds, mode: s.mode, freeEnd: RULES.freeMinutes * 60 } : null;
    },

    // 暂停（不计算时长）
    pause(slug) { },

    format(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    },
  };

  window.Arcade = Arcade;
})();