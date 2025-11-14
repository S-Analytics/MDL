import { PolicyGenerator } from './PolicyGenerator';
import { MetricDefinition, DataType, ValidationRuleType } from '../models';

describe('PolicyGenerator', () => {
  const createSampleMetric = (): MetricDefinition => ({
    id: 'test-metric-123',
    name: 'Test Metric',
    description: 'A test metric',
    category: 'test',
    dataType: DataType.NUMBER,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('generatePolicy', () => {
    it('should generate basic policy without validation or governance', () => {
      const metric = createSampleMetric();
      const policy = PolicyGenerator.generatePolicy(metric);

      expect(policy).toContain('package metrics.test_metric_123');
      expect(policy).toContain('default allow = false');
      expect(policy).toContain('allow if');
    });

    it('should include validation rules in policy', () => {
      const metric: MetricDefinition = {
        ...createSampleMetric(),
        validationRules: [
          {
            type: ValidationRuleType.MIN,
            value: 0,
          },
          {
            type: ValidationRuleType.MAX,
            value: 100,
          },
        ],
      };

      const policy = PolicyGenerator.generatePolicy(metric);

      expect(policy).toContain('validate_value');
      expect(policy).toContain('input.value >= 0');
      expect(policy).toContain('input.value <= 100');
    });

    it('should include range validation in policy', () => {
      const metric: MetricDefinition = {
        ...createSampleMetric(),
        validationRules: [
          {
            type: ValidationRuleType.RANGE,
            value: [1, 10],
          },
        ],
      };

      const policy = PolicyGenerator.generatePolicy(metric);

      expect(policy).toContain('input.value >= 1');
      expect(policy).toContain('input.value <= 10');
    });

    it('should include enum validation in policy', () => {
      const metric: MetricDefinition = {
        ...createSampleMetric(),
        validationRules: [
          {
            type: ValidationRuleType.ENUM,
            value: ['active', 'inactive', 'pending'],
          },
        ],
      };

      const policy = PolicyGenerator.generatePolicy(metric);

      expect(policy).toContain('input.value in ["active", "inactive", "pending"]');
    });

    it('should include governance rules in policy', () => {
      const metric: MetricDefinition = {
        ...createSampleMetric(),
        governance: {
          owner: 'test-owner',
          team: 'test-team',
          approvers: ['approver1', 'approver2'],
        },
      };

      const policy = PolicyGenerator.generatePolicy(metric);

      expect(policy).toContain('validate_governance');
      expect(policy).toContain('test-owner');
      expect(policy).toContain('test-team');
      expect(policy).toContain('approver1');
    });

    it('should include metric metadata in comments', () => {
      const metric = createSampleMetric();
      const policy = PolicyGenerator.generatePolicy(metric);

      expect(policy).toContain('# OPA Policy for Metric: Test Metric');
      expect(policy).toContain('# Category: test');
    });
  });

  describe('generatePolicyBundle', () => {
    it('should generate policies for multiple metrics', () => {
      const metrics: MetricDefinition[] = [
        createSampleMetric(),
        { ...createSampleMetric(), id: 'another-metric', name: 'Another Metric' },
      ];

      const bundle = PolicyGenerator.generatePolicyBundle(metrics);

      expect(bundle.size).toBe(2);
      expect(bundle.has('test_metric_123.rego')).toBe(true);
      expect(bundle.has('another_metric.rego')).toBe(true);
    });

    it('should sanitize metric IDs for file names', () => {
      const metric: MetricDefinition = {
        ...createSampleMetric(),
        id: 'test-metric.with-special$chars',
      };

      const bundle = PolicyGenerator.generatePolicyBundle([metric]);
      const fileName = Array.from(bundle.keys())[0];

      expect(fileName).toBe('test_metric_with_special_chars.rego');
    });
  });
});
