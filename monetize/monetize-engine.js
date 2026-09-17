const path = require('path');
const { ProductFactory, PRODUCT_TYPES } = require('./product-factory');
const { AutoPublisher, PLATFORMS, PRICE_BASE } = require('./auto-publisher');
const { Watchdog } = require('./watchdog');

class MonetizeEngine {
  constructor(options = {}) {
    this.logs = [];
    this.productFactory = new ProductFactory(options.outputDir || path.join(__dirname, 'generated'));
    this.publisher = new AutoPublisher();
    this.watchdog = new Watchdog({
      productFactory: this.productFactory,
      publisher: this.publisher,
      onLog: (msg) => this.log(msg)
    });
    this.businessPlan = {
      dailyRevenueTarget: options.dailyRevenueTarget || 30000,
      profitTarget: options.profitTarget || 0.5,
      operatingHours: '24/7'
    };
    this.log('全托管运营赚钱系统引擎已初始化');
  }

  log(message) {
    const entry = { message, timestamp: new Date().toISOString() };
    this.logs.push(entry);
    if (this.logs.length > 1000) this.logs = this.logs.slice(-500);
    console.log(message);
  }

  getLogs(limit = 50) {
    return this.logs.slice(-limit);
  }

  start() {
    const result = this.watchdog.start();
    this.log('🟢 24小时值守引擎已启动，开始全自动运营');
    return result;
  }

  stop() {
    const result = this.watchdog.stop();
    this.log('🔴 值守引擎已停止');
    return result;
  }

  generateProduct(idea = {}) {
    try {
      const product = this.productFactory.generate(idea);
      this.log(`⚙️ 生成产品: ${product.name} (${product.type})`);
      return product;
    } catch (e) {
      this.log(`❌ 生成失败: ${e.message}`);
      throw e;
    }
  }

  publishProduct(productId, platformKey) {
    const product = this.productFactory.get(productId);
    if (!product) {
      const products = this.productFactory.list();
      if (products.length === 0) {
        const p = this.generateProduct();
        return this.publishProduct(p.id, platformKey);
      }
      const p = products[products.length - 1];
      return this.publishProduct(p.id, platformKey);
    }
    const result = this.publisher.publish(product, platformKey);
    this.log(`📤 已上载: ${result.listing.title} → ${result.platform.name}`);
    return result;
  }

  simulateSale(listingId) {
    const sales = this.publisher.simulateSales(listingId);
    this.log(`💰 模拟销售成功`);
    return sales;
  }

  getDashboard() {
    const productStats = this.productFactory.list();
    return {
      engine: 'monetize-engine',
      status: this.watchdog.running ? 'running' : 'stopped',
      businessPlan: this.businessPlan,
      watchdog: this.watchdog.getStatus(),
      publishers: this.publisher.getStats(),
      products: {
        total: productStats.length,
        byType: this.groupByType(productStats),
        recent: productStats.slice(-6)
      },
      revenue: Math.round(this.publisher.revenue * 100) / 100,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  groupByType(products) {
    const grouped = {};
    products.forEach(p => {
      grouped[p.type] = (grouped[p.type] || 0) + 1;
    });
    return grouped;
  }

  getFullStatus() {
    return {
      productTypes: this.productFactory.getSupportedTypes(),
      platforms: this.publisher.getPlatforms(),
      pricing: PRICE_BASE,
      dashboard: this.getDashboard(),
      logs: this.getLogs(50)
    };
  }
}

module.exports = { MonetizeEngine, PRODUCT_TYPES, PLATFORMS, PRICE_BASE };