class FinancialSystem {
  constructor() {
    this.accounts = {
      revenue: 0,
      costs: 0,
      profit: 0,
      reserve: 0
    };
    
    this.distribution = {
      operations: { percent: 20, label: '公司正常经营', min: 20, max: 30 },
      overhead: { percent: 5, label: '日常开销', min: 5, max: 5 },
      employeeBonus: { percent: 5, label: '员工福利和分红', min: 5, max: 10 },
      dividends: { percent: 25, label: '股东分红', min: 25, max: 30 },
      investment: { percent: 10, label: '投资基金', min: 10, max: 12 },
      charity: { percent: 5, label: '公益基金', min: 5, max: 10 },
      expansion: { percent: 10, label: '公司发展扩张', min: 10, max: 15 },
      reserve: { percent: 5, label: '维持基金', min: 5, max: 10 },
      emergency: { percent: 5, label: '应急储备', min: 1, max: 5 }
    };
    
    this.targets = {
      dailyRevenue: 30000,
      weeklyRevenue: 210000,
      monthlyRevenue: 900000,
      profitMargin: { min: 50, max: 100 },
      grossMargin: { min: 100, max: 200 }
    };
    
    this.expenses = [];
    this.income = [];
  }

  addRevenue(amount, source = 'sales') {
    this.accounts.revenue += amount;
    this.income.push({
      amount,
      source,
      timestamp: new Date().toISOString()
    });
  }

  addExpense(amount, category, description = '') {
    this.accounts.costs += amount;
    this.expenses.push({
      amount,
      category,
      description,
      timestamp: new Date().toISOString()
    });
    
    this.accounts.profit = this.accounts.revenue - this.accounts.costs;
  }

  calculateDistribution(total) {
    const result = {};
    
    for (const [key, config] of Object.entries(this.distribution)) {
      const amount = total * config.percent / 100;
      result[key] = {
        percent: config.percent,
        amount: amount,
        label: config.label
      };
    }
    
    return result;
  }

  getFinancialReport() {
    const profit = this.accounts.revenue - this.accounts.costs;
    const profitMargin = this.accounts.revenue > 0 ? (profit / this.accounts.revenue) * 100 : 0;
    const distribution = this.calculateDistribution(profit);
    
    return {
      summary: {
        revenue: this.accounts.revenue,
        costs: this.accounts.costs,
        profit: profit,
        profitMargin: profitMargin.toFixed(2) + '%'
      },
      targets: this.targets,
      distribution: distribution,
      performance: {
        dailyTarget: this.targets.dailyRevenue,
        currentRevenue: this.accounts.revenue,
        achievement: ((this.accounts.revenue / this.targets.dailyRevenue) * 100).toFixed(2) + '%'
      },
      income: this.income.slice(-10),
      expenses: this.expenses.slice(-10)
    };
  }

  adjustTargets(achievementPercent) {
    if (achievementPercent >= 100) {
      const increase = 1 + (Math.random() * 0.3);
      this.targets.dailyRevenue = Math.floor(this.targets.dailyRevenue * increase);
      this.targets.weeklyRevenue = this.targets.dailyRevenue * 7;
      this.targets.monthlyRevenue = this.targets.dailyRevenue * 30;
    }
    return this.targets;
  }

  optimizeProfitMargin() {
    const currentMargin = this.accounts.revenue > 0 
      ? ((this.accounts.revenue - this.accounts.costs) / this.accounts.revenue) * 100 
      : 0;
    
    const recommendations = [];
    
    if (currentMargin < 50) {
      recommendations.push({
        type: 'urgent',
        message: '利润率低于50%，需要立即调整',
        actions: ['降低运营成本', '提高产品售价', '优化供应链']
      });
    }
    
    if (currentMargin >= 50 && currentMargin < 100) {
      recommendations.push({
        type: 'normal',
        message: '利润率正常，目标100%+',
        actions: ['扩大销售规模', '降低边际成本']
      });
    }
    
    return recommendations;
  }

  analyzeTax() {
    const profit = this.accounts.profit;
    const taxRate = 0.25;
    const estimatedTax = profit * taxRate;
    
    return {
      grossProfit: profit,
      taxRate: (taxRate * 100) + '%',
      estimatedTax: estimatedTax,
      netProfit: profit - estimatedTax,
      optimization: {
        recommendations: [
          '合理利用税收优惠政策',
          '增加合规成本抵扣',
          '优化收入结构'
        ]
      }
    };
  }
}

class ProcurementSystem {
  constructor() {
    this.products = [];
    this.suppliers = [];
    this.orders = [];
  }

  addProduct(product) {
    this.products.push({
      ...product,
      id: 'prod_' + Date.now(),
      addedAt: new Date().toISOString()
    });
  }

  findProduct(keyword) {
    return this.products.filter(p => 
      p.name.toLowerCase().includes(keyword.toLowerCase()) ||
      p.category?.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  reorder(productId) {
    const product = this.products.find(p => p.id === productId);
    if (product && product.stock < product.minStock) {
      this.orders.push({
        productId,
        type: 'reorder',
        quantity: product.reorderQty || 100,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      return { status: 'reorder_created', product };
    }
    return { status: 'no_reorder_needed' };
  }
}

class SalesManager {
  constructor() {
    this.dailyTarget = 30000;
    this.currentSales = 0;
    this.orders = [];
    this.customers = [];
  }

  addOrder(order) {
    this.orders.push(order);
    this.currentSales += order.amount;
    
    return {
      orderId: 'order_' + Date.now(),
      amount: order.amount,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
  }

  getPerformance() {
    return {
      dailyTarget: this.dailyTarget,
      currentSales: this.currentSales,
      achievement: ((this.currentSales / this.dailyTarget) * 100).toFixed(2) + '%',
      remaining: Math.max(0, this.dailyTarget - this.currentSales),
      orders: this.orders.length
    };
  }

  adjustTarget(achievementPercent) {
    if (achievementPercent >= 100) {
      const increase = 0.1 + Math.random() * 0.2;
      this.dailyTarget = Math.floor(this.dailyTarget * (1 + increase));
    }
    return this.dailyTarget;
  }
}

const financialSystem = new FinancialSystem();
const procurementSystem = new ProcurementSystem();
const salesManager = new SalesManager();

module.exports = {
  FinancialSystem,
  ProcurementSystem,
  SalesManager,
  financialSystem,
  procurementSystem,
  salesManager
};