const fs = require('fs');
const path = require('path');

class AIEmployeeBase {
  constructor(config) {
    this.id = config.id || this.generateId();
    this.name = config.name;
    this.role = config.role;
    this.department = config.department || 'general';
    this.skills = config.skills || [];
    this.capabilities = config.capabilities || [];
    this.status = 'idle';
    this.memory = [];
    this.learningHistory = [];
    this.kpi = {
      target: config.kpiTarget || 0,
      achieved: 0,
      score: 0
    };
    this.createdAt = new Date().toISOString();
    this.lastActive = new Date().toISOString();
    this.autonomy = config.autonomy || 70;
    this.evolution = true;
    this.active = true;
  }

  generateId() {
    return 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async executeTask(task) {
    this.status = 'working';
    this.lastActive = new Date().toISOString();
    
    try {
      const result = await this.processTask(task);
      this.status = 'idle';
      this.learn(task, result);
      return result;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async processTask(task) {
    throw new Error('processTask must be implemented by subclass');
  }

  learn(task, result) {
    this.memory.push({
      task: task,
      result: result,
      timestamp: new Date().toISOString()
    });
    
    if (this.memory.length > 1000) {
      this.memory = this.memory.slice(-500);
    }
  }

  evolve(newCapabilities) {
    this.capabilities = [...new Set([...this.capabilities, ...newCapabilities])];
    this.learningHistory.push({
      timestamp: new Date().toISOString(),
      newCapabilities: newCapabilities
    });
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      department: this.department,
      skills: this.skills,
      capabilities: this.capabilities,
      status: this.status,
      kpi: this.kpi,
      autonomy: this.autonomy,
      active: this.active,
      lastActive: this.lastActive,
      memoryLength: this.memory.length
    };
  }
}

class AICEO extends AIEmployeeBase {
  constructor(config) {
    super({
      ...config,
      role: 'CEO',
      department: 'executive',
      autonomy: 95,
      skills: ['leadership', 'decision_making', 'strategic_planning', 'resource_allocation']
    });
    
    this.subordinates = [];
    this.decisions = [];
    this.strategy = null;
    this.dailyTargets = {
      revenue: config.dailyRevenueTarget || 30000,
      customers: config.dailyCustomerTarget || 100,
      orders: config.dailyOrderTarget || 50
    };
  }

  async processTask(task) {
    switch (task.type) {
      case 'strategic_plan':
        return await this.createStrategy(task.data);
      case 'allocate_resources':
        return await this.allocateResources(task.data);
      case 'make_decision':
        return await this.makeDecision(task.data);
      case 'review_performance':
        return await this.reviewPerformance();
      case 'give_command':
        return await this.giveCommand(task.data);
      default:
        return { status: 'unknown_task_type' };
    }
  }

  async createStrategy(data) {
    this.strategy = {
      ...data,
      timestamp: new Date().toISOString(),
      goals: data.goals || []
    };
    return { strategy: this.strategy, status: 'created' };
  }

  async allocateResources(data) {
    return {
      allocated: true,
      resources: data,
      timestamp: new Date().toISOString()
    };
  }

  async makeDecision(data) {
    const decision = {
      ...data,
      timestamp: new Date().toISOString(),
      decision_maker: this.id
    };
    this.decisions.push(decision);
    return { decision: decision, approved: true };
  }

  async reviewPerformance() {
    return {
      dailyTargets: this.dailyTargets,
      currentPerformance: {
        revenue: this.dailyTargets.revenue,
        customers: this.dailyTargets.customers
      },
      timestamp: new Date().toISOString()
    };
  }

  async giveCommand(data) {
    return {
      command: data,
      from: this.id,
      timestamp: new Date().toISOString()
    };
  }
}

class AICFO extends AIEmployeeBase {
  constructor(config) {
    super({
      ...config,
      role: 'CFO',
      department: 'finance',
      autonomy: 90,
      skills: ['financial_planning', 'budgeting', 'risk_management', 'investment']
    });
    
    this.financialData = {
      revenue: 0,
      costs: 0,
      profit: 0,
      profitMargin: 0
    };
    
    this.distribution = {
      operations: 25,
      overhead: 5,
      employeeBonus: 7.5,
      dividends: 27.5,
      investment: 11,
      charity: 5,
      expansion: 12,
      reserve: 7
    };
  }

  async processTask(task) {
    switch (task.type) {
      case 'calculate_financials':
        return await this.calculateFinancials(task.data);
      case 'allocate_funds':
        return await this.allocateFunds(task.data);
      case 'analyze_profit':
        return await this.analyzeProfit(task.data);
      case 'generate_report':
        return await this.generateFinancialReport();
      case 'optimize_taxes':
        return await this.optimizeTaxes(task.data);
      default:
        return { status: 'unknown_task' };
    }
  }

  async calculateFinancials(data) {
    const revenue = data.revenue || 0;
    const costs = data.costs || 0;
    const profit = revenue - costs;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    this.financialData = { revenue, costs, profit, profitMargin };
    
    return this.financialData;
  }

  async allocateFunds(data) {
    const total = data.total || 0;
    const allocation = {};
    
    for (const [key, percentage] of Object.entries(this.distribution)) {
      allocation[key] = (total * percentage / 100);
    }
    
    return { allocation, timestamp: new Date().toISOString() };
  }

  async analyzeProfit(data) {
    const grossProfit = data.revenue - data.costs;
    const netProfit = grossProfit * 0.5;
    
    return {
      grossProfit,
      netProfit,
      margin: data.revenue > 0 ? (grossProfit / data.revenue * 100) : 0,
      timestamp: new Date().toISOString()
    };
  }

  async generateFinancialReport() {
    return {
      ...this.financialData,
      distribution: this.distribution,
      generatedAt: new Date().toISOString()
    };
  }

  async optimizeTaxes(data) {
    return {
      strategy: 'legal_optimization',
      recommendations: [
        'reinvest profits for tax reduction',
        'use legitimate deductions',
        'structure for optimal rate'
      ],
      savingsEstimate: data.profit * 0.15
    };
  }
}

class AIEmployeeManager {
  constructor() {
    this.employees = new Map();
    this.ceo = null;
    this.cfo = null;
    this.departments = {
      executive: [],
      finance: [],
      sales: [],
      marketing: [],
      operations: [],
      logistics: [],
      customer_service: [],
      it: [],
      hr: [],
      legal: []
    };
  }

  createEmployee(config) {
    let employee;
    
    if (config.role === 'CEO') {
      employee = new AICEO(config);
      this.ceo = employee;
    } else if (config.role === 'CFO') {
      employee = new AICFO(config);
      this.cfo = employee;
    } else {
      employee = new AIEmployeeBase(config);
    }
    
    this.employees.set(employee.id, employee);
    
    if (config.department) {
      this.departments[config.department].push(employee.id);
    }
    
    return employee;
  }

  getEmployee(id) {
    return this.employees.get(id);
  }

  getDepartment(department) {
    return this.departments[department].map(id => this.employees.get(id));
  }

  getAllEmployees() {
    return Array.from(this.employees.values()).map(e => e.toJSON());
  }

  async executeTask(task) {
    const employee = this.employees.get(task.assignTo);
    if (!employee) {
      throw new Error('Employee not found');
    }
    return await employee.executeTask(task);
  }
}

const aiManager = new AIEmployeeManager();

aiManager.createEmployee({
  id: 'ai_ceo_001',
  name: 'AI CEO',
  role: 'CEO',
  department: 'executive',
  dailyRevenueTarget: 30000
});

aiManager.createEmployee({
  id: 'ai_cfo_001',
  name: 'AI CFO', 
  role: 'CFO',
  department: 'finance'
});

aiManager.createEmployee({
  id: 'ai_sales_001',
  name: 'AI Sales Director',
  role: 'Sales Director',
  department: 'sales',
  skills: ['sales', 'negotiation', 'customer_relations']
});

aiManager.createEmployee({
  id: 'ai_marketing_001',
  name: 'AI Marketing Director',
  role: 'Marketing Director',
  department: 'marketing',
  skills: ['digital_marketing', 'seo', 'ads']
});

aiManager.createEmployee({
  id: 'ai_ops_001',
  name: 'AI Operations Director',
  role: 'Operations Director',
  department: 'operations',
  skills: ['logistics', 'supply_chain', 'inventory']
});

aiManager.createEmployee({
  id: 'ai_logistics_001',
  name: 'AI Logistics Manager',
  role: 'Logistics Manager',
  department: 'logistics',
  skills: ['shipping', 'tracking', 'delivery']
});

aiManager.createEmployee({
  id: 'ai_cs_001',
  name: 'AI Customer Service Lead',
  role: 'Customer Service Lead',
  department: 'customer_service',
  skills: ['support', 'communication', 'problem_solving']
});

aiManager.createEmployee({
  id: 'ai_it_001',
  name: 'AI CTO',
  role: 'CTO',
  department: 'it',
  skills: ['architecture', 'security', 'development']
});

module.exports = {
  AIEmployeeBase,
  AICEO,
  AICFO,
  AIEmployeeManager
};