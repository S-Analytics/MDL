import { MetricDefinition, ValidationRuleType } from '../models';

/**
 * OPA Policy Generator
 * Generates Open Policy Agent policies from metric definitions
 */
export class PolicyGenerator {
  /**
   * Generate OPA policies for a metric definition
   */
  static generatePolicy(metric: MetricDefinition): string {
    const packageName = this.sanitizePackageName(metric.id);
    
    let policy = `# OPA Policy for Metric: ${metric.name}\n`;
    policy += `# Category: ${metric.category}\n`;
    policy += `# Generated at: ${new Date().toISOString()}\n\n`;
    policy += `package metrics.${packageName}\n\n`;
    
    // Import future keywords for better policy syntax
    policy += `import future.keywords.if\nimport future.keywords.in\n\n`;
    
    // Default deny
    policy += `default allow = false\n\n`;
    
    // Generate validation rules
    if (metric.validationRules && metric.validationRules.length > 0) {
      policy += this.generateValidationRules(metric);
    }
    
    // Generate governance rules
    if (metric.governance) {
      policy += this.generateGovernanceRules(metric);
    }
    
    // Main allow rule
    policy += `# Main authorization rule\n`;
    policy += `allow if {\n`;
    policy += `    input.metric_id == "${metric.id}"\n`;
    
    if (metric.validationRules && metric.validationRules.length > 0) {
      policy += `    validate_value\n`;
    }
    
    if (metric.governance) {
      policy += `    validate_governance\n`;
    }
    
    policy += `}\n`;
    
    return policy;
  }

  /**
   * Generate validation rules for OPA policy
   */
  private static generateValidationRules(metric: MetricDefinition): string {
    let rules = `# Validation rules\n`;
    
    rules += `validate_value if {\n`;
    const conditions: string[] = [];
    
    metric.validationRules?.forEach((rule) => {
      switch (rule.type) {
        case ValidationRuleType.MIN:
          conditions.push(`    input.value >= ${rule.value}`);
          break;
        case ValidationRuleType.MAX:
          conditions.push(`    input.value <= ${rule.value}`);
          break;
        case ValidationRuleType.RANGE:
          if (rule.value && Array.isArray(rule.value) && rule.value.length === 2) {
            conditions.push(`    input.value >= ${rule.value[0]}`);
            conditions.push(`    input.value <= ${rule.value[1]}`);
          }
          break;
        case ValidationRuleType.REQUIRED:
          conditions.push(`    input.value != null`);
          break;
        case ValidationRuleType.ENUM:
          if (rule.value && Array.isArray(rule.value)) {
            const values = rule.value.map((v) => `"${v}"`).join(', ');
            conditions.push(`    input.value in [${values}]`);
          }
          break;
      }
    });
    
    if (conditions.length > 0) {
      rules += conditions.join('\n') + '\n';
    } else {
      rules += `    true\n`;
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
    
    if (metric.governance?.owner) {
      rules += `    # Check if requester has appropriate permissions\n`;
      rules += `    input.user.id == "${metric.governance.owner}"\n`;
    }
    
    if (metric.governance?.approvers && metric.governance.approvers.length > 0) {
      rules += `} else if {\n`;
      rules += `    # Or is an approved user\n`;
      const approvers = metric.governance.approvers.map((a) => `"${a}"`).join(', ');
      rules += `    input.user.id in [${approvers}]\n`;
    }
    
    if (metric.governance?.team) {
      rules += `} else if {\n`;
      rules += `    # Or belongs to the team\n`;
      rules += `    input.user.team == "${metric.governance.team}"\n`;
    }
    
    rules += `}\n\n`;
    return rules;
  }

  /**
   * Generate a complete OPA policy bundle for multiple metrics
   */
  static generatePolicyBundle(metrics: MetricDefinition[]): Map<string, string> {
    const policies = new Map<string, string>();
    
    metrics.forEach((metric) => {
      const fileName = `${this.sanitizePackageName(metric.id)}.rego`;
      const policy = this.generatePolicy(metric);
      policies.set(fileName, policy);
    });
    
    return policies;
  }

  /**
   * Sanitize metric ID for OPA package name
   */
  private static sanitizePackageName(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}
