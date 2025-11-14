import { MetricDefinition } from '../../src/models';
import { PolicyGenerator } from '../../src/opa/PolicyGenerator';

describe('PolicyGenerator', () => {
  const createSampleMetric = (): MetricDefinition => ({
    metric_id: 'test-metric-123',
    name: 'Test Metric',
    short_name: 'test_metric',
    description: 'A test metric',
    category: 'test',
    tier: 'Tier-2',
    business_domain: 'test',
    metric_type: 'operational',
    tags: ['test'],
    alignment: {
      strategic_pillar: 'Test',
      primary_objective_ids: [],
      related_okr_ids: [],
      why_it_matters: 'Test metric',
    },
    definition: {
      formula: 'count',
      formula_detail: 'Simple count',
      numerator: { event_name: 'test', filters: [] },
      denominator: { event_name: 'total', filters: [] },
      unit: 'count',
      expected_direction: 'increase',
      example_calculation: {},
    },
    data: {
      primary_sources: [],
      secondary_sources: [],
      data_freshness: 'daily',
      update_frequency: 'daily',
      time_grain: ['day'],
      data_retention: '90_days',
    },
    governance: {
      data_classification: 'internal',
      pii_involved: false,
      regulatory_constraints: [],
      owner_team: 'test-team',
      technical_owner: 'test-owner',
      business_owner: 'test-business',
      version: '1.0.0',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    dimensions: [],
    targets_and_alerts: {
      target_value: 0,
      warning_threshold: 0,
      critical_threshold: 0,
      comparison_baseline: 'previous',
      alert_rules: [],
    },
    visualization: {
      default_chart_type: 'line',
      default_time_range: 'last_30_days',
      dashboard_locations: [],
      drilldowns: [],
    },
    relationships: {
      upstream_metric_ids: [],
      downstream_metric_ids: [],
      tradeoffs: [],
    },
    operational_usage: {
      decision_use_cases: [],
      review_cadence: 'weekly',
      linked_playbooks: [],
    },
    metadata: {
      notes: '',
      example_queries: [],
    },
  });

  describe('generatePolicy', () => {
    it('should generate basic policy without thresholds or governance', () => {
      const metric = createSampleMetric();
      const policy = PolicyGenerator.generatePolicy(metric);

      expect(policy).toContain('package metrics.test_metric_123');
      expect(policy).toContain('default allow = false');
      expect(policy).toContain('allow if');
    });

    it('should include threshold validation rules in policy', () => {
      const metric: MetricDefinition = {
        ...createSampleMetric(),
        targets_and_alerts: {
          target_value: 0.98,
          warning_threshold: 0.95,
          critical_threshold: 0.90,
          comparison_baseline: 'previous_7_days',
          alert_rules: [
            {
              rule_id: 'ALERT-001',
              condition: 'value < critical_threshold',
              severity: 'critical',
              notify_channels: ['slack:#alerts'],
              evaluation_window: '15_minutes',
            },
          ],
        },
      };

      const policy = PolicyGenerator.generatePolicy(metric);

      expect(policy).toContain('validate_thresholds');
      expect(policy).toContain('0.9');
      expect(policy).toContain('Target: 0.98');
    });

    it('should include governance rules in policy', () => {
      const metric: MetricDefinition = {
        ...createSampleMetric(),
        governance: {
          ...createSampleMetric().governance,
          technical_owner: 'test-tech-owner',
          business_owner: 'test-biz-owner',
          owner_team: 'test-owner-team',
        },
      };

      const policy = PolicyGenerator.generatePolicy(metric);

      expect(policy).toContain('validate_governance');
      expect(policy).toContain('test-tech-owner');
      expect(policy).toContain('test-biz-owner');
      expect(policy).toContain('test-owner-team');
    });

    it('should include metric metadata in comments', () => {
      const metric = createSampleMetric();
      const policy = PolicyGenerator.generatePolicy(metric);

      expect(policy).toContain('# OPA Policy for Metric: Test Metric');
      expect(policy).toContain('# Category: test');
      expect(policy).toContain('# Business Domain: test');
      expect(policy).toContain('# Tier: Tier-2');
    });
  });

  describe('generatePolicyBundle', () => {
    it('should generate policies for multiple metrics', () => {
      const metrics: MetricDefinition[] = [
        createSampleMetric(),
        { ...createSampleMetric(), metric_id: 'another-metric', name: 'Another Metric' },
      ];

      const bundle = PolicyGenerator.generatePolicyBundle(metrics);

      expect(bundle.size).toBe(2);
      expect(bundle.has('test_metric_123.rego')).toBe(true);
      expect(bundle.has('another_metric.rego')).toBe(true);
    });

    it('should sanitize metric IDs for file names', () => {
      const metric: MetricDefinition = {
        ...createSampleMetric(),
        metric_id: 'test-metric.with-special$chars',
      };

      const bundle = PolicyGenerator.generatePolicyBundle([metric]);
      const fileName = Array.from(bundle.keys())[0];

      expect(fileName).toBe('test_metric_with_special_chars.rego');
    });
  });
});
