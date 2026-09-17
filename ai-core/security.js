const crypto = require('crypto');

class SecuritySystem {
  constructor() {
    this.firewall = {
      enabled: true,
      rules: [],
      blockedIPs: new Set(),
      rateLimits: new Map()
    };
    
    this.encryption = {
      algorithm: 'aes-256-gcm',
      key: crypto.scryptSync(process.env.SECRET_KEY || 'default-secret', 'salt', 32)
    };
    
    this.auditLog = [];
    this.sessions = new Map();
  }

  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.encryption.algorithm, this.encryption.key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      data: encrypted,
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = crypto.createDecipheriv(this.encryption.algorithm, this.encryption.key, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  addFirewallRule(rule) {
    this.firewall.rules.push({
      ...rule,
      id: 'rule_' + Date.now(),
      createdAt: new Date().toISOString()
    });
  }

  checkAccess(clientIP, endpoint) {
    if (this.firewall.blockedIPs.has(clientIP)) {
      return { allowed: false, reason: 'blocked' };
    }

    const now = Date.now();
    const lastRequest = this.firewall.rateLimits.get(clientIP) || 0;
    
    if (now - lastRequest < 100) {
      return { allowed: false, reason: 'rate_limit' };
    }
    
    this.firewall.rateLimits.set(clientIP, now);
    
    this.auditLog.push({
      ip: clientIP,
      endpoint,
      timestamp: new Date().toISOString(),
      action: 'access'
    });
    
    return { allowed: true };
  }

  blockIP(ip) {
    this.firewall.blockedIPs.add(ip);
    this.auditLog.push({
      ip,
      action: 'blocked',
      timestamp: new Date().toISOString()
    });
  }

  getAuditLog(limit = 100) {
    return this.auditLog.slice(-limit);
  }

  generateToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, {
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    return token;
  }

  verifyToken(token) {
    const session = this.sessions.get(token);
    if (!session) return false;
    
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(token);
      return false;
    }
    
    return true;
  }

  sanitizeInput(input) {
    if (typeof input === 'string') {
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    return input;
  }
}

class EvolutionSystem {
  constructor() {
    this.evolutionHistory = [];
    this.improvements = [];
    this.bugFixes = [];
  }

  recordImprovement(area, description, impact) {
    this.improvements.push({
      area,
      description,
      impact,
      timestamp: new Date().toISOString()
    });
  }

  recordBugFix(bug, solution, success) {
    this.bugFixes.push({
      bug,
      solution,
      success,
      timestamp: new Date().toISOString()
    });
  }

  evolve(capability, newLevel) {
    this.evolutionHistory.push({
      capability,
      from: 'level_' + Date.now(),
      to: newLevel,
      timestamp: new Date().toISOString()
    });
  }

  getImprovements(area = null) {
    if (area) {
      return this.improvements.filter(i => i.area === area);
    }
    return this.improvements;
  }

  getStats() {
    return {
      totalImprovements: this.improvements.length,
      totalBugFixes: this.bugFixes.length,
      totalEvolutions: this.evolutionHistory.length,
      successRate: this.bugFixes.length > 0 
        ? (this.bugFixes.filter(b => b.success).length / this.bugFixes.length * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }
}

const securitySystem = new SecuritySystem();
const evolutionSystem = new EvolutionSystem();

module.exports = {
  SecuritySystem,
  EvolutionSystem,
  securitySystem,
  evolutionSystem
};