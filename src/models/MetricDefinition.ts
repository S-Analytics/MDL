/**
 * Core Metric Catalog model
 * Represents a comprehensive metrics definition library with objectives, key results, and detailed metric definitions
 */

export interface MetricsCatalog {
  catalog_version: string;
  catalog_name: string;
  last_updated: string;
  owner_team: string;
  contacts: Contact[];
  objectives: Objective[];
  metrics: MetricDefinition[];
}

export interface Contact {
  name: string;
  email: string;
}

export interface Objective {
  objective_id: string;
  name: string;
  description: string;
  timeframe: Timeframe;
  owner_team: string;
  status: string;
  key_results: KeyResult[];
}

export interface Timeframe {
  start: string;
  end: string;
}

export interface KeyResult {
  kr_id: string;
  name: string;
  description: string;
  target_value: number;
  baseline_value: number;
  unit: string;
  direction: 'increase' | 'decrease';
  current_value: number | null;
  metric_ids: string[];
}

export interface MetricDefinition {
  metric_id: string;
  name: string;
  short_name: string;
  description: string;
  category: string;
  tier: string;
  business_domain: string;
  metric_type: string;
  tags: string[];
  alignment: Alignment;
  definition: Definition;
  data: DataInfo;
  governance: GovernanceInfo;
  dimensions: Dimension[];
  targets_and_alerts: TargetsAndAlerts;
  visualization: Visualization;
  relationships: Relationships;
  operational_usage: OperationalUsage;
  metadata: MetricMetadata;
}

export interface Alignment {
  strategic_pillar: string;
  primary_objective_ids: string[];
  related_okr_ids: string[];
  why_it_matters: string;
}

export interface Definition {
  formula: string;
  formula_detail: string;
  numerator: EventDefinition;
  denominator: EventDefinition;
  unit: string;
  expected_direction: 'increase' | 'decrease';
  example_calculation: ExampleCalculation;
}

export interface EventDefinition {
  event_name: string;
  filters: any[];
}

export interface ExampleCalculation {
  [key: string]: number;
}

export interface DataInfo {
  primary_sources: DataSource[];
  secondary_sources: DataSource[];
  data_freshness: string;
  update_frequency: string;
  time_grain: string[];
  data_retention: string;
}

export interface DataSource {
  system: string;
  table_or_stream: string;
  connection_id: string;
}

export interface GovernanceInfo {
  data_classification: string;
  pii_involved: boolean;
  regulatory_constraints: string[];
  owner_team: string;
  technical_owner: string;
  business_owner: string;
  version: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Dimension {
  name: string;
  allowed_values: string[];
  required: boolean;
}

export interface TargetsAndAlerts {
  target_value: number;
  warning_threshold: number;
  critical_threshold: number;
  comparison_baseline: string;
  alert_rules: AlertRule[];
}

export interface AlertRule {
  rule_id: string;
  condition: string;
  severity: string;
  notify_channels: string[];
  evaluation_window: string;
}

export interface Visualization {
  default_chart_type: string;
  default_time_range: string;
  dashboard_locations: DashboardLocation[];
  drilldowns: string[];
}

export interface DashboardLocation {
  tool: string;
  url: string;
}

export interface Relationships {
  upstream_metric_ids: string[];
  downstream_metric_ids: string[];
  tradeoffs: string[];
}

export interface OperationalUsage {
  decision_use_cases: string[];
  review_cadence: string;
  linked_playbooks: Playbook[];
}

export interface Playbook {
  name: string;
  url: string;
}

export interface MetricMetadata {
  notes: string;
  example_queries: ExampleQuery[];
  version: string;
  created_at: string;
  created_by: string;
  last_updated: string;
  last_updated_by: string;
  change_history: ChangeHistoryEntry[];
}

export interface ExampleQuery {
  language: string;
  query: string;
}

export interface ChangeHistoryEntry {
  version: string;
  timestamp: string;
  changed_by: string;
  change_type: 'major' | 'minor' | 'patch';
  changes_summary: string;
  fields_changed: string[];
}

// Legacy interfaces for backward compatibility
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
