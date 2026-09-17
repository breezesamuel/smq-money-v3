const fs = require('fs');
const path = require('path');

class CommandCenter {
  constructor(aiManager) {
    this.aiManager = aiManager;
    this.commands = [];
    this.alerts = [];
    this.manualInterventionRequired = [];
    this.monitoring = true;
    this.logs = [];
    this.init();
  }

  init() {
    this.startMonitoring();
  }

  startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.monitorSystem();
    }, 30000);
  }

  async monitorSystem() {
    const ceo = this.aiManager.ceo;
    const cfo = this.aiManager.cfo;
    
    if (!ceo || !cfo) return;

    const performance = await ceo.reviewPerformance();
    
    if (performance.dailyTargets.revenue < 30000 * 0.5) {
      this.addAlert({
        level: 'critical',
        message: 'Revenue below 50% of target!',
        data: performance
      });
    }

    this.log('System monitored', performance);
  }

  log(action, data) {
    this.logs.push({
      action,
      data,
      timestamp: new Date().toISOString()
    });

    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
  }

  addAlert(alert) {
    this.alerts.push({
      ...alert,
      timestamp: new Date().toISOString(),
      read: false
    });

    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }
  }

  sendCommand(command) {
    const cmd = {
      ...command,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    this.commands.push(cmd);
    this.log('Command sent', command);

    return cmd;
  }

  requestManualIntervention(issue) {
    const request = {
      ...issue,
      timestamp: new Date().toISOString(),
      status: 'pending_review'
    };

    this.manualInterventionRequired.push(request);
    this.addAlert({
      level: 'warning',
      message: 'Manual intervention required',
      data: issue
    });

    return request;
  }

  getStatus() {
    return {
      monitoring: this.monitoring,
      alerts: this.alerts.filter(a => !a.read).length,
      pendingCommands: this.commands.filter(c => c.status === 'pending').length,
      manualRequests: this.manualInterventionRequired.filter(r => r.status === 'pending_review').length,
      employees: this.aiManager.getAllEmployees().length,
      logs: this.logs.length
    };
  }

  getDashboard() {
    const ceo = this.aiManager.ceo;
    const cfo = this.aiManager.cfo;
    const employees = this.aiManager.getAllEmployees();

    return {
      system_status: ceo ? 'online' : 'offline',
      ceo_status: ceo ? ceo.status : 'not_assigned',
      cfo_status: cfo ? cfo.status : 'not_assigned',
      total_employees: employees.length,
      active_employees: employees.filter(e => e.status === 'working').length,
      idle_employees: employees.filter(e => e.status === 'idle').length,
      alerts: this.alerts.slice(-10),
      commands: this.commands.slice(-10),
      manual_requests: this.manualInterventionRequired.slice(-10),
      recent_logs: this.logs.slice(-20)
    };
  }

  approveManualRequest(requestId, approved) {
    const request = this.manualInterventionRequired.find(r => r.id === requestId);
    if (request) {
      request.status = approved ? 'approved' : 'rejected';
      request.resolvedAt = new Date().toISOString();
    }
    return request;
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    this.monitoring = false;
  }
}

class CustomerServiceConsole {
  constructor() {
    this.tickets = [];
    this.knowledge = [];
  }

  createTicket(data) {
    const ticket = {
      id: 'ticket_' + Date.now(),
      ...data,
      status: 'open',
      createdAt: new Date().toISOString()
    };

    this.tickets.push(ticket);
    return ticket;
  }

  resolveTicket(ticketId, resolution) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = 'resolved';
      ticket.resolution = resolution;
      ticket.resolvedAt = new Date().toISOString();
    }
    return ticket;
  }

  getTickets() {
    return this.tickets;
  }
}

class DecisionConsole {
  constructor() {
    this.pending = [];
    this.history = [];
    this.threshold = 80;
  }

  requestDecision(decision) {
    const req = {
      id: 'decision_' + Date.now(),
      ...decision,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    if (decision.priority >= this.threshold) {
      this.pending.push(req);
    }

    return req;
  }

  approveDecision(decisionId, approved, notes) {
    const decision = this.pending.find(d => d.id === decisionId);
    if (decision) {
      decision.status = approved ? 'approved' : 'rejected';
      decision.notes = notes;
      decision.resolvedAt = new Date().toISOString();
      this.history.push(decision);
      this.pending = this.pending.filter(d => d.id !== decisionId);
    }
    return decision;
  }

  getPendingDecisions() {
    return this.pending;
  }
}

module.exports = {
  CommandCenter,
  CustomerServiceConsole,
  DecisionConsole
};