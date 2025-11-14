/**
 * Core Metric Definition model
 * Represents a metric with metadata, validation rules, and governance information
 */

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  dataType: DataType;
  unit?: string;
  tags?: string[];
  validationRules?: ValidationRule[];
  governance?: GovernanceInfo;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export enum DataType {
  NUMBER = 'number',
  PERCENTAGE = 'percentage',
  CURRENCY = 'currency',
  COUNT = 'count',
  RATIO = 'ratio',
  DURATION = 'duration',
  BOOLEAN = 'boolean',
  STRING = 'string',
}

export interface ValidationRule {
  type: ValidationRuleType;
  value?: any;
  message?: string;
}

export enum ValidationRuleType {
  MIN = 'min',
  MAX = 'max',
  RANGE = 'range',
  REQUIRED = 'required',
  PATTERN = 'pattern',
  ENUM = 'enum',
}

export interface GovernanceInfo {
  owner: string;
  team?: string;
  approvers?: string[];
  complianceLevel?: ComplianceLevel;
  dataClassification?: DataClassification;
  retentionPeriod?: string;
  auditRequired?: boolean;
}

export enum ComplianceLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
}

export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  SENSITIVE = 'sensitive',
  HIGHLY_SENSITIVE = 'highly_sensitive',
}

export interface MetricDefinitionInput {
  name: string;
  description: string;
  category: string;
  dataType: DataType;
  unit?: string;
  tags?: string[];
  validationRules?: ValidationRule[];
  governance?: GovernanceInfo;
  source?: string;
  metadata?: Record<string, any>;
}
