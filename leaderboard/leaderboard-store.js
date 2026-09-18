// leaderboard/leaderboard-store.js - 街机排行榜存储（JSON 文件持久化；Serverless 降级内存）
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const FILE = path.join(DIR, 'leaderboard.json');

const mem = { entries: {} }; // gameId -> Array<{player, score, ts, deviceId, playId}>

let cache = null; // 用来表示文件是否可写（null 未探测，true/false 结果）

function read() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    return { entries: JSON.parse(raw).entries || {} };
  } catch (e) {
    return { entries: { ...mem.entries } };
  }
}

function write(data) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) { return false; }
}

function addScore(gameId, entry) {
  const d = read();
  const list = d.entries[gameId] || (d.entries[gameId] = []);
  list.push(entry);
  // 保留 top 200，防止无限膨胀
  list.sort((a, b) => (b.score - a.score) || (a.ts - b.ts));
  if (list.length > 200) d.entries[gameId] = list.slice(0, 200);
  write(d);
  // 同步内存缓存
  mem.entries[gameId] = d.entries[gameId];
  return { rank: list.findIndex(e => e === entry) + 1, total: list.length };
}

function topList(gameId, n) {
  const d = read();
  const list = (d.entries[gameId] || []).slice(0, n);
  return list.map(e => ({ player: e.player, score: e.score, ts: e.ts }));
}

function allGames() {
  const d = read();
  return Object.keys(d.entries);
}

module.exports = { addScore, topList, allGames, FILE };