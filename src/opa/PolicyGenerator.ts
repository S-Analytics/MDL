import { MetricDefinition } from '../models';

/**
 * OPA Policy Generator
 * Generates Open Policy Agent policies from metric definitions
 */
export class PolicyGenerator {
  /**
   * Generate OPA policies for a metric definition
   */
  static generatePolicy(metric: MetricDefinition): string {
    const packageName = this.sanitizePackageName(metric.metric_id);
    
    let policy = `# OPA Policy for Metric: ${metric.name}\n`;
    policy += `# Category: ${metric.category}\n`;
    policy += `# Business Domain: ${metric.business_domain}\n`;
    policy += `# Tier: ${metric.tier}\n`;
    policy += `# Generated at: ${new Date().toISOString()}\n\n`;
    policy += `package metrics.${packageName}\n\n`;
    
    // Import future keywords for better policy syntax
    policy += `import future.keywords.if\nimport future.keywords.in\n\n`;
    
    // Default deny
    policy += `default allow = false\n\n`;
    
    // Generate target and alert rules
    if (metric.targets_and_alerts && metric.targets_and_alerts.alert_rules.length > 0) {
      policy += this.generateAlertRules(metric);
    }
    
    // Generate governance rules
    if (metric.governance) {
      policy += this.generateGovernanceRules(metric);
    }
    
    // Main allow rule
    policy += `# Main authorization rule\n`;
    policy += `allow if {\n`;
    policy += `    input.metric_id == "${metric.metric_id}"\n`;
    
    if (metric.targets_and_alerts && metric.targets_and_alerts.alert_rules.length > 0) {
      policy += `    validate_thresholds\n`;
    }
    
    if (metric.governance) {
      policy += `    validate_governance\n`;
    }
    
    policy += `}\n`;
    
    return policy;
  }

  /**
   * Generate alert threshold rules for OPA policy
   */
  private static generateAlertRules(metric: MetricDefinition): string {
    let rules = `# Threshold validation rules\n`;
    
    rules += `validate_thresholds if {\n`;
    rules += `    # Check if value is within acceptable range\n`;
    
    if (metric.targets_and_alerts) {
      const { target_value, warning_threshold, critical_threshold } = metric.targets_and_alerts;
      rules += `    input.value >= ${critical_threshold}\n`;
      rules += `    # Target: ${target_value}, Warning: ${warning_threshold}, Critical: ${critical_threshold}\n`;
    }
    
    rules += `}\n\n`;
    return rules;
  }

  /**
   * Generate governance rules for OPA policy
   */
  private static generateGovernanceRules(metric: MetricDefinition): string {
    let rules = `# Governance rules\n`;
    
    rules += `validate_governance if {\n`;
    
    if (metric.governance?.technical_owner) {
      rules += `    # Check if requester is technical owner\n`;
      rules += `    input.user.id == "${metric.governance.technical_owner}"\n`;
    }
    
    if (metric.governance?.business_owner) {
      rules += `} else if {\n`;
      rules += `    # Or is business owner\n`;
      rules += `    input.user.id == "${metric.governance.business_owner}"\n`;
    }
    
    if (metric.governance?.owner_team) {
      rules += `} else if {\n`;
      rules += `    # Or belongs to the owner team\n`;
      rules += `    input.user.team == "${metric.governance.owner_team}"\n`;
    }
    
    rules += `}\n\n`;
    return rules;
  }

  /**
   * Generate a complete OPA policy bundle for multiple metrics
   */
  static generatePolicyBundle(metrics: MetricDefinition[]): Map<string, string> {
    const policies = new Map<string, string>();
    
    for (const metric of metrics) {
      const fileName = `${this.sanitizePackageName(metric.metric_id)}.rego`;
      const policy = this.generatePolicy(metric);
      policies.set(fileName, policy);
    }
    
    return policies;
  }

  /**
   * Sanitize metric ID for OPA package name
   */
  private static sanitizePackageName(id: string): string {
    return id.replace(/\W/g, '_');
  }
}
