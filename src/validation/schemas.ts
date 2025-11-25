/**
 * Joi validation schemas for MDL API endpoints
 * Provides request validation for body, query params, and path params
 */

import Joi from 'joi';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

const idSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .pattern(/^[A-Za-z0-9_-]+$/)
  .messages({
    'string.pattern.base': 'ID must contain only alphanumeric characters, hyphens, and underscores',
  });

const emailSchema = Joi.string().email().trim().lowercase();

const urlSchema = Joi.string().uri().trim();

const dateSchema = Joi.alternatives().try(
  Joi.date().iso(),
  Joi.string().isoDate()
);

// ============================================================================
// METRIC DEFINITION SCHEMAS
// ============================================================================

const contactSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: emailSchema.required(),
});

const eventDefinitionSchema = Joi.object({
  event_name: Joi.string().trim().required(),
  filters: Joi.array().items(Joi.object()).default([]),
});

const dataSourceSchema = Joi.object({
  system: Joi.string().trim().required(),
  table_or_stream: Joi.string().trim().required(),
  connection_id: Joi.string().trim().required(),
});

const dimensionSchema = Joi.object({
  name: Joi.string().trim().required(),
  allowed_values: Joi.array().items(Joi.string()).default([]),
  required: Joi.boolean().default(false),
});

const alertRuleSchema = Joi.object({
  rule_id: idSchema.required(),
  condition: Joi.string().trim().required(),
  severity: Joi.string()
    .valid('critical', 'warning', 'info')
    .required(),
  notify_channels: Joi.array().items(Joi.string()).min(1).required(),
  evaluation_window: Joi.string().trim().required(),
});

const dashboardLocationSchema = Joi.object({
  tool: Joi.string().trim().required(),
  url: urlSchema.required(),
});

const playbookSchema = Joi.object({
  name: Joi.string().trim().required(),
  url: urlSchema.required(),
});

const exampleQuerySchema = Joi.object({
  language: Joi.string().trim().required(),
  query: Joi.string().trim().required(),
});

const changeHistoryEntrySchema = Joi.object({
  version: Joi.string().trim().required(),
  timestamp: dateSchema.required(),
  changed_by: Joi.string().trim().required(),
  change_type: Joi.string()
    .valid('major', 'minor', 'patch')
    .required(),
  changes_summary: Joi.string().trim().required(),
  fields_changed: Joi.array().items(Joi.string()).default([]),
});

export const metricDefinitionSchema = Joi.object({
  metric_id: idSchema.required(),
  name: Joi.string().trim().min(1).max(200).required(),
  short_name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().min(1).max(2000).required(),
  category: Joi.string().trim().required(),
  tier: Joi.string()
    .valid('Tier-1', 'Tier-2', 'Tier-3')
    .required(),
  business_domain: Joi.string().trim().required(),
  metric_type: Joi.string()
    .valid('leading', 'lagging', 'operational')
    .required(),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  
  alignment: Joi.object({
    strategic_pillar: Joi.string().trim().required(),
    primary_objective_ids: Joi.array().items(idSchema).default([]),
    related_okr_ids: Joi.array().items(Joi.string()).default([]),
    why_it_matters: Joi.string().trim().required(),
  }).required(),
  
  definition: Joi.object({
    formula: Joi.string().trim().required(),
    formula_detail: Joi.string().trim().required(),
    numerator: eventDefinitionSchema.required(),
    denominator: eventDefinitionSchema.required(),
    unit: Joi.string().trim().required(),
    expected_direction: Joi.string()
      .valid('increase', 'decrease')
      .required(),
    example_calculation: Joi.object().pattern(
      Joi.string(),
      Joi.number()
    ).required(),
  }).required(),
  
  data: Joi.object({
    primary_sources: Joi.array().items(dataSourceSchema).min(1).required(),
    secondary_sources: Joi.array().items(dataSourceSchema).default([]),
    data_freshness: Joi.string().trim().required(),
    update_frequency: Joi.string().trim().required(),
    time_grain: Joi.array().items(Joi.string()).min(1).required(),
    data_retention: Joi.string().trim().required(),
  }).required(),
  
  governance: Joi.object({
    data_classification: Joi.string().trim().required(),
    pii_involved: Joi.boolean().required(),
    regulatory_constraints: Joi.array().items(Joi.string()).default([]),
    owner_team: Joi.string().trim().required(),
    technical_owner: Joi.string().trim().required(),
    business_owner: Joi.string().trim().required(),
    version: Joi.string().trim().required(),
    status: Joi.string()
      .valid('active', 'deprecated', 'draft')
      .required(),
    created_at: dateSchema.required(),
    updated_at: dateSchema.required(),
  }).required(),
  
  dimensions: Joi.array().items(dimensionSchema).default([]),
  
  targets_and_alerts: Joi.object({
    target_value: Joi.number().required(),
    warning_threshold: Joi.number().required(),
    critical_threshold: Joi.number().required(),
    comparison_baseline: Joi.string().trim().required(),
    alert_rules: Joi.array().items(alertRuleSchema).default([]),
  }).required(),
  
  visualization: Joi.object({
    default_chart_type: Joi.string().trim().required(),
    default_time_range: Joi.string().trim().required(),
    dashboard_locations: Joi.array().items(dashboardLocationSchema).default([]),
    drilldowns: Joi.array().items(Joi.string()).default([]),
  }).required(),
  
  relationships: Joi.object({
    upstream_metric_ids: Joi.array().items(idSchema).default([]),
    downstream_metric_ids: Joi.array().items(idSchema).default([]),
    tradeoffs: Joi.array().items(Joi.string()).default([]),
  }).required(),
  
  operational_usage: Joi.object({
    decision_use_cases: Joi.array().items(Joi.string()).min(1).required(),
    review_cadence: Joi.string().trim().required(),
    linked_playbooks: Joi.array().items(playbookSchema).default([]),
  }).required(),
  
  metadata: Joi.object({
    notes: Joi.string().trim().allow('').default(''),
    example_queries: Joi.array().items(exampleQuerySchema).default([]),
    version: Joi.string().trim().allow(''),
    created_at: dateSchema.allow(''),
    created_by: Joi.string().trim().allow(''),
    last_updated: dateSchema.allow(''),
    last_updated_by: Joi.string().trim().allow(''),
    change_history: Joi.array().items(changeHistoryEntrySchema).default([]),
  }).default({}),
});

// Schema for updating metrics (all fields optional except metric_id)
export const metricUpdateSchema = metricDefinitionSchema.fork(
  [
    'name',
    'short_name',
    'description',
    'category',
    'tier',
    'business_domain',
    'metric_type',
    'alignment',
    'definition',
    'data',
    'governance',
    'targets_and_alerts',
    'visualization',
    'relationships',
    'operational_usage',
  ],
  (schema) => schema.optional()
);

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

export const metricQuerySchema = Joi.object({
  category: Joi.string().trim(),
  tier: Joi.string().valid('Tier-1', 'Tier-2', 'Tier-3'),
  business_domain: Joi.string().trim(),
  metric_type: Joi.string().valid('leading', 'lagging', 'operational'),
  tag: Joi.string().trim(),
  tags: Joi.alternatives().try(
    Joi.string().trim(),
    Joi.array().items(Joi.string().trim())
  ),
  status: Joi.string().valid('active', 'deprecated', 'draft'),
  search: Joi.string().trim(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

export const metricIdParamSchema = Joi.object({
  id: idSchema.required(),
});

// ============================================================================
// DATABASE CONFIGURATION SCHEMA
// ============================================================================

export const databaseConfigSchema = Joi.object({
  host: Joi.string().hostname().required(),
  port: Joi.number().port().required(),
  database: Joi.string().trim().min(1).required(),
  user: Joi.string().trim().min(1).required(),
  password: Joi.string().allow(''),
  ssl: Joi.boolean().default(false),
  max: Joi.number().integer().min(1).max(100).default(10),
  idleTimeoutMillis: Joi.number().integer().min(0).default(30000),
  connectionTimeoutMillis: Joi.number().integer().min(0).default(5000),
});

// ============================================================================
// DOMAIN SCHEMAS
// ============================================================================

export const domainSchema = Joi.object({
  domain_id: idSchema.required(),
  name: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).required(),
  owner_team: Joi.string().trim().required(),
  status: Joi.string()
    .valid('active', 'deprecated', 'draft')
    .default('active'),
  created_at: dateSchema.allow(''),
  updated_at: dateSchema.allow(''),
  metadata: Joi.object().unknown(true).default({}),
});

export const domainUpdateSchema = domainSchema.fork(
  ['name', 'description', 'owner_team'],
  (schema) => schema.optional()
);

export const domainIdParamSchema = Joi.object({
  id: idSchema.required(),
});

// ============================================================================
// OBJECTIVE SCHEMAS
// ============================================================================

const timeframeSchema = Joi.object({
  start: dateSchema.required(),
  end: dateSchema.required(),
}).custom((value, helpers) => {
  if (new Date(value.start) >= new Date(value.end)) {
    return helpers.error('timeframe.invalid');
  }
  return value;
}, 'Timeframe validation').messages({
  'timeframe.invalid': 'Timeframe start date must be before end date',
});

const keyResultSchema = Joi.object({
  kr_id: idSchema.required(),
  name: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).required(),
  target_value: Joi.number().required(),
  baseline_value: Joi.number().required(),
  unit: Joi.string().trim().required(),
  direction: Joi.string()
    .valid('increase', 'decrease')
    .required(),
  current_value: Joi.number().allow(null).default(null),
  metric_ids: Joi.array().items(idSchema).default([]),
});

export const objectiveSchema = Joi.object({
  objective_id: idSchema.required(),
  name: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).required(),
  timeframe: timeframeSchema.required(),
  owner_team: Joi.string().trim().required(),
  status: Joi.string()
    .valid('draft', 'active', 'completed', 'cancelled')
    .default('draft'),
  key_results: Joi.array().items(keyResultSchema).min(1).required(),
  created_at: dateSchema.allow(''),
  updated_at: dateSchema.allow(''),
  metadata: Joi.object().unknown(true).default({}),
});

export const objectiveUpdateSchema = objectiveSchema.fork(
  ['name', 'description', 'timeframe', 'owner_team', 'key_results'],
  (schema) => schema.optional()
);

export const objectiveIdParamSchema = Joi.object({
  id: idSchema.required(),
});

// ============================================================================
// BULK OPERATION SCHEMAS
// ============================================================================

export const bulkDeleteSchema = Joi.object({
  ids: Joi.array().items(idSchema).min(1).max(100).required(),
});

export const bulkSaveMetricsSchema = Joi.object({
  metrics: Joi.array().items(metricDefinitionSchema).min(1).max(100).required(),
});

export const bulkSaveDomainsSchema = Joi.object({
  domains: Joi.array().items(domainSchema).min(1).max(100).required(),
});

export const bulkSaveObjectivesSchema = Joi.object({
  objectives: Joi.array().items(objectiveSchema).min(1).max(100).required(),
});

// ============================================================================
// IMPORT/EXPORT SCHEMAS
// ============================================================================

export const importDataSchema = Joi.object({
  format: Joi.string()
    .valid('json', 'yaml')
    .default('json'),
  data: Joi.alternatives()
    .try(
      Joi.object({
        metrics: Joi.array().items(metricDefinitionSchema).default([]),
        domains: Joi.array().items(domainSchema).default([]),
        objectives: Joi.array().items(objectiveSchema).default([]),
      }),
      Joi.string().trim() // For YAML string
    )
    .required(),
  mode: Joi.string()
    .valid('merge', 'replace', 'skip')
    .default('merge'),
  validate_only: Joi.boolean().default(false),
});

export const exportFormatSchema = Joi.object({
  format: Joi.string()
    .valid('json', 'yaml', 'docx', 'pdf')
    .default('json'),
  include: Joi.object({
    metrics: Joi.boolean().default(true),
    domains: Joi.boolean().default(true),
    objectives: Joi.boolean().default(true),
  }).default({}),
  filters: Joi.object({
    status: Joi.string().valid('active', 'deprecated', 'draft'),
    category: Joi.string(),
    tier: Joi.string().valid('Tier-1', 'Tier-2', 'Tier-3'),
  }).default({}),
});

export const exportObjectiveDocxSchema = Joi.object({
  objective_id: idSchema.required(),
  include_metrics: Joi.boolean().default(true),
  include_key_results: Joi.boolean().default(true),
  template: Joi.string().valid('standard', 'executive', 'technical').default('standard'),
});

// ============================================================================
// AUTHENTICATION SCHEMAS (for future use)
// ============================================================================

export const loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  password: Joi.string().min(8).required(),
});

export const registerSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, hyphens, and underscores',
    }),
  email: emailSchema.required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  full_name: Joi.string().trim().min(1).max(100).required(),
  role: Joi.string()
    .valid('viewer', 'editor', 'admin')
    .default('viewer'),
});

export const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
});

// ============================================================================
// API KEY SCHEMAS (for future use)
// ============================================================================

export const apiKeyCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).allow(''),
  expires_at: dateSchema.allow(null).default(null),
  scopes: Joi.array()
    .items(
      Joi.string().valid(
        'metrics:read',
        'metrics:write',
        'domains:read',
        'domains:write',
        'objectives:read',
        'objectives:write',
        'admin'
      )
    )
    .min(1)
    .required(),
});

export const apiKeyIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// ============================================================================
// USER MANAGEMENT SCHEMAS
// ============================================================================

export const userIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const userUpdateSchema = Joi.object({
  email: emailSchema,
  full_name: Joi.string().trim().min(1).max(100),
  role: Joi.string().valid('viewer', 'editor', 'admin'),
  status: Joi.string().valid('active', 'inactive', 'suspended'),
}).min(1); // At least one field required

export const userListQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
  role: Joi.string().valid('viewer', 'editor', 'admin'),
  status: Joi.string().valid('active', 'inactive', 'suspended'),
});
