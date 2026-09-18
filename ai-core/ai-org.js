const { AIEmployeeManager } = require('./employees');
const { modelRouter } = require('./model-router');
const { getKey } = require('./config');

const PROFILES = {
  CEO: { name: 'AI CEO', dept: 'executive', skills: ['leadership', 'strategy', 'decision_making', 'resource_allocation'], autonomy: 95, system: 'You are the CEO of the company. Provide strategic vision, make high-level decisions, allocate resources, review performance. Always give concrete actionable plans with numbers.' },
  CFO: { name: 'AI CFO', dept: 'finance', skills: ['financial_planning', 'budgeting', 'risk_management', 'investment', 'revenue_forecast'], autonomy: 92, system: 'You are the CFO. Analyze P&L, set budgets, manage cash flow, recommend pricing and cost cuts. Respond with concrete numbers and percentages.' },
  COO: { name: 'AI COO', dept: 'operations', skills: ['operations', 'supply_chain', 'workflow', 'execution'], autonomy: 88, system: 'You are the COO. Turn strategy into executable operational plans, coordinate departments, optimize workflows. Give step-by-step actions.' },
  CTO: { name: 'AI CTO', dept: 'it', skills: ['architecture', 'development', 'security', 'ai_systems'], autonomy: 90, system: 'You are the CTO. Advise on tech architecture, AI systems, developer guidance, security posture. Give technical specifics.' },
  CMO: { name: 'AI CMO', dept: 'marketing', skills: ['digital_marketing', 'seo', 'ads', 'branding', 'acquisition'], autonomy: 87, system: 'You are the CMO. Design marketing campaigns, channel strategy, conversion optimization, brand voice. Give campaign specifics with budgets and metrics.' },
  CSO: { name: 'AI Sales Director', dept: 'sales', skills: ['sales', 'negotiation', 'pricing', 'customer_acquisition'], autonomy: 85, system: 'You are the Sales Director. Build sales funnels, set quotas, design pricing and bundles, close strategy. Give concrete targets and tactics.' },
  CRO: { name: 'AI CRO', dept: 'operations', skills: ['risk_management', 'compliance', 'fraud_detection'], autonomy: 80, system: 'You are the CRO (Chief Risk Officer). Identify business, payment, security risks and propose mitigation. Be specific about controls.' },
  CCSU: { name: 'AI Customer Success', dept: 'customer_service', skills: ['support', 'retention', 'communication'], autonomy: 78, system: 'You are the Customer Success lead. Write empathetic, solution-oriented replies, improve retention.' }
};

class SmartEmployee {
  constructor(role) {
    this.profile = PROFILES[role];
    this.brain = modelRouter;
    this.tasksExecuted = 0;
    this.latency = [];
  }

  async execute(kind, taskData = {}) {
    this.tasksExecuted++;
    const prompt = this.buildPrompt(kind, taskData);
    const t0 = Date.now();
    const result = await this.brain.call(prompt, {
      system: this.profile.system,
      maxTokens: 1200
    });
    this.latency.push(Date.now() - t0);
    if (this.latency.length > 100) this.latency.shift();
    return {
      task: kind,
      result: result.content,
      model: result.model,
      provider: result.provider,
      timestamp: new Date().toISOString(),
      error: result.error || null
    };
  }

  buildPrompt(kind, data) {
    const json = JSON.stringify(data, null, 1).slice(0, 1500);
    return `[任务类型: ${kind}]\n[输入数据]: ${json}\n请以专业、可执行的方案输出，包含具体数字和下一步行动。`;
  }

  getStats() {
    return {
      role: this.profile.name,
      department: this.profile.dept,
      skills: this.profile.skills,
      tasksExecuted: this.tasksExecuted,
      avgLatencyMs: this.latency.length ? Math.round(this.latency.reduce((a, b) => a + b, 0) / this.latency.length) : 0
    };
  }
}

function buildOrg() {
  const manager = new AIEmployeeManager();
  const org = {};
  for (const role of Object.keys(PROFILES)) {
    const smart = new SmartEmployee(role);
    org[role] = smart;
    manager.createEmployee({
      id: `org_${role.toLowerCase()}_001`,
      name: PROFILES[role].name,
      role: PROFILES[role].name,
      department: PROFILES[role].dept,
      skills: PROFILES[role].skills,
      autonomy: PROFILES[role].autonomy
    });
  }
  return { manager, org };
}

const orgSingleton = buildOrg();

// 每日主管例会：CEO 当日工作总结并分派今日任务
async function dailyBoardMeeting(context = {}) {
  const status = await orgSingleton.org.CEO.execute('daily_board_meeting', {
    instructions: context.instructions || 'review today\'s work, set priorities for today, allocate today\'s budget.',
    companyContext: {
      dailyRevenueTarget: context.dailyRevenueTarget || 5000,
      currentRevenue: context.currentRevenue || 0,
      toolsCount: context.toolsCount || 512
    },
    departments: Object.keys(PROFILES)
  });
  return status;
}

module.exports = {
  PROFILES,
  SmartEmployee,
  buildOrg,
  orgSingleton,
  weeklyBoardMeeting: dailyBoardMeeting,
  dailyBoardMeeting,
  orgManager: orgSingleton.manager,
  orgEmployees: orgSingleton.org
};