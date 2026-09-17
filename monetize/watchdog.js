const WATCHDOG_INTERVALS = {
  TICK: 60 * 1000,
  GENERATE: 5 * 60 * 1000,
  PUBLISH: 10 * 60 * 1000,
  SIMULATE: 3 * 60 * 1000,
  HEALTH: 30 * 1000
};

class Watchdog {
  constructor({ productFactory, publisher, onLog } = {}) {
    this.factories = { productFactory, publisher };
    this.onLog = onLog || (() => {});
    this.running = false;
    this.intervals = {};
    this.heartbeat = {
      startedAt: null,
      lastTick: null,
      mode: 'idle'
    };
    this.counters = {
      ticks: 0,
      products: 0,
      publications: 0,
      sales: 0
    };
    this.cycles = [];
  }

  start() {
    if (this.running) return { status: 'already_running' };
    this.running = true;
    this.heartbeat.startedAt = new Date().toISOString();
    this.heartbeat.mode = 'active';

    this.intervals.tick = setInterval(() => this.tick(), WATCHDOG_INTERVALS.TICK);
    this.intervals.generate = setInterval(() => this.autoGenerate(), WATCHDOG_INTERVALS.GENERATE);
    this.intervals.publish = setInterval(() => this.autoPublish(), WATCHDOG_INTERVALS.PUBLISH);
    this.intervals.simulate = setInterval(() => this.autoSimulate(), WATCHDOG_INTERVALS.SIMULATE);
    this.intervals.health = setInterval(() => this.healthCheck(), WATCHDOG_INTERVALS.HEALTH);

    this.record('心跳已启动，进入24小时值守模式');
    this.autoGenerate();
    return { status: 'running', startedAt: this.heartbeat.startedAt };
  }

  stop() {
    if (!this.running) return { status: 'already_stopped' };
    this.running = false;
    Object.values(this.intervals).forEach(i => clearInterval(i));
    this.intervals = {};
    this.heartbeat.mode = 'stopped';
    this.record('值守已停止');
    return { status: 'stopped' };
  }

  tick() {
    if (!this.running) return;
    this.counters.ticks++;
    this.heartbeat.lastTick = new Date().toISOString();
    this.logWarn('tick', `值守滴答 #${this.counters.ticks}`);
  }

  autoGenerate() {
    if (!this.running || !this.factories.productFactory) return;
    try {
      const types = ['website', 'app', 'ai_tool', 'pain_tool', 'mini_program', 'mini_game', 'desktop_ai'];
      const type = types[Math.floor(Math.random() * types.length)];
      const product = this.factories.productFactory.generate({ type });
      this.counters.products++;
      this.record('generate', `产品已自动生成: ${product.name} (${product.type})`);
      return product;
    } catch (e) {
      this.record('error', `产品生成失败: ${e.message}`);
      return null;
    }
  }

  autoPublish() {
    if (!this.running || !this.factories.publisher) return;
    try {
      const products = this.factories.productFactory.list();
      if (products.length === 0) return null;
      const product = products[Math.floor(Math.random() * products.length)];
      const fullProduct = this.factories.productFactory.get(product.id);
      if (!fullProduct) return null;
      const result = this.factories.publisher.autoPublish(fullProduct);
      this.counters.publications++;
      this.record('publish', `已自动上载发布: ${result.listing.title} → ${result.platform.name} (¥${result.listing.price})`);
      return result;
    } catch (e) {
      this.record('error', `自动发布失败: ${e.message}`);
      return null;
    }
  }

  autoSimulate() {
    if (!this.running || !this.factories.publisher) return;
    try {
      const listings = this.factories.publisher.listings;
      if (!listings || listings.length === 0) return;
      const listing = listings[Math.floor(Math.random() * listings.length)];
      const sales = this.factories.publisher.simulateSales(listing.id);
      if (sales) {
        this.counters.sales++;
        this.record('sales', `模拟销售: ${listing.title} +${sales.unitsSold} 单, 收入 ¥${sales.revenue}`);
      }
    } catch (e) {
      this.record('error', `模拟销售失败: ${e.message}`);
    }
  }

  healthCheck() {
    if (!this.running) return;
    const up = process.uptime();
    const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const healthy = up > 0;
    if (!healthy) {
      this.record('error', '健康检查异常，系统不可用!');
    }
    this.record('health', `健康检查: OK (运行 ${up.toFixed(0)}s, 内存 ${mem}MB)`);
    return { up, mem, running: this.running };
  }

  getStatus() {
    const up = this.heartbeat.startedAt
      ? Math.round((Date.now() - new Date(this.heartbeat.startedAt).getTime()) / 1000)
      : 0;
    return {
      running: this.running,
      mode: this.heartbeat.mode,
      uptime: up + 's',
      lastTick: this.heartbeat.lastTick,
      counters: this.counters,
      recentCycles: this.cycles.slice(-20),
      schedule: {
        tickMs: WATCHDOG_INTERVALS.TICK,
        generateMs: WATCHDOG_INTERVALS.GENERATE,
        publishMs: WATCHDOG_INTERVALS.PUBLISH,
        simulateMs: WATCHDOG_INTERVALS.SIMULATE
      },
      timestamp: new Date().toISOString()
    };
  }

  record(kind, message) {
    const entry = { kind, message, timestamp: new Date().toISOString() };
    this.cycles.push(entry);
    const msg = `🧭 [${entry.timestamp}] [${kind}] ${message}`;
    this.onLog(msg);
  }

  logWarn(kind, message) {
    this.record(kind, message);
  }
}

module.exports = { Watchdog, WATCHDOG_INTERVALS };