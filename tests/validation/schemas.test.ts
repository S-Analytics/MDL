import {
    apiKeyCreateSchema,
    bulkDeleteSchema,
    changePasswordSchema,
    databaseConfigSchema,
    domainSchema,
    domainUpdateSchema,
    exportFormatSchema,
    importDataSchema,
    loginSchema,
    metricDefinitionSchema,
    metricIdParamSchema,
    metricQuerySchema,
    metricUpdateSchema,
    objectiveSchema,
    refreshTokenSchema,
    registerSchema,
    userListQuerySchema,
    userUpdateSchema
} from '../../src/validation/schemas';

describe('Validation Schemas', () => {
  describe('Common ID Schema', () => {
    it('should accept valid IDs', () => {
      const { error } = metricIdParamSchema.validate({ id: 'METRIC-123' });
      expect(error).toBeUndefined();
    });

    it('should accept IDs with underscores and hyphens', () => {
      const { error } = metricIdParamSchema.validate({ id: 'metric_id-123' });
      expect(error).toBeUndefined();
    });

    it('should reject IDs with invalid characters', () => {
      const { error } = metricIdParamSchema.validate({ id: 'metric@123' });
      expect(error).toBeDefined();
      expect(error?.message).toContain('alphanumeric');
    });

    it('should reject empty IDs', () => {
      const { error } = metricIdParamSchema.validate({ id: '' });
      expect(error).toBeDefined();
    });

    it('should reject IDs that are too long', () => {
      const longId = 'a'.repeat(101);
      const { error } = metricIdParamSchema.validate({ id: longId });
      expect(error).toBeDefined();
    });
  });

  describe('Metric Definition Schema', () => {
    const validMetric = {
      metric_id: 'METRIC-001',
      name: 'Test Metric',
      short_name: 'test_metric',
      description: 'A test metric',
      category: 'KPI',
      tier: 'Tier-1',
      business_domain: 'Digital',
      metric_type: 'leading',
      tags: ['test'],
      alignment: {
        strategic_pillar: 'Growth',
        primary_objective_ids: [],
        related_okr_ids: [],
        why_it_matters: 'Important',
      },
      definition: {
        formula: 'a / b',
        formula_detail: 'Detailed formula',
        numerator: { event_name: 'success', filters: [] },
        denominator: { event_name: 'total', filters: [] },
        unit: 'ratio',
        expected_direction: 'increase',
        example_calculation: { a: 10, b: 100 },
      },
      data: {
        primary_sources: [
          {
            system: 'analytics',
            table_or_stream: 'events',
            connection_id: 'warehouse',
          },
        ],
        secondary_sources: [],
        data_freshness: 'real_time',
        update_frequency: '5_minutes',
        time_grain: ['hour', 'day'],
        data_retention: '365_days',
      },
      governance: {
        data_classification: 'Non-PII',
        pii_involved: false,
        regulatory_constraints: [],
        owner_team: 'Analytics',
        technical_owner: 'eng',
        business_owner: 'product',
        version: '1.0.0',
        status: 'active',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      dimensions: [],
      targets_and_alerts: {
        target_value: 0.98,
        warning_threshold: 0.95,
        critical_threshold: 0.90,
        comparison_baseline: 'previous_7_days',
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
        decision_use_cases: ['Decision making'],
        review_cadence: 'daily',
        linked_playbooks: [],
      },
      metadata: {
        notes: '',
        example_queries: [],
      },
    };

    it('should validate a complete metric definition', () => {
      const { error } = metricDefinitionSchema.validate(validMetric);
      expect(error).toBeUndefined();
    });

    it('should reject metric with missing required fields', () => {
      const { metric_id, ...incomplete } = validMetric;
      const { error } = metricDefinitionSchema.validate(incomplete);
      expect(error).toBeDefined();
      expect(error?.message).toContain('metric_id');
    });

    it('should reject metric with invalid tier', () => {
      const invalid = { ...validMetric, tier: 'Tier-4' };
      const { error } = metricDefinitionSchema.validate(invalid);
      expect(error).toBeDefined();
      expect(error?.message).toContain('tier');
    });

    it('should reject metric with invalid metric_type', () => {
      const invalid = { ...validMetric, metric_type: 'invalid' };
      const { error } = metricDefinitionSchema.validate(invalid);
      expect(error).toBeDefined();
    });

    it('should reject metric with invalid expected_direction', () => {
      const invalid = {
        ...validMetric,
        definition: { ...validMetric.definition, expected_direction: 'stable' },
      };
      const { error } = metricDefinitionSchema.validate(invalid);
      expect(error).toBeDefined();
    });

    it('should require at least one primary data source', () => {
      const invalid = {
        ...validMetric,
        data: { ...validMetric.data, primary_sources: [] },
      };
      const { error } = metricDefinitionSchema.validate(invalid);
      expect(error).toBeDefined();
      expect(error?.message).toContain('primary_sources');
    });

    it('should validate metric with alert rules', () => {
      const withAlerts = {
        ...validMetric,
        targets_and_alerts: {
          ...validMetric.targets_and_alerts,
          alert_rules: [
            {
              rule_id: 'ALERT-001',
              condition: 'value < threshold',
              severity: 'critical',
              notify_channels: ['email', 'slack'],
              evaluation_window: '5m',
            },
          ],
        },
      };
      const { error } = metricDefinitionSchema.validate(withAlerts);
      expect(error).toBeUndefined();
    });

    it('should reject alert rule with invalid severity', () => {
      const withBadAlert = {
        ...validMetric,
        targets_and_alerts: {
          ...validMetric.targets_and_alerts,
          alert_rules: [
            {
              rule_id: 'ALERT-001',
              condition: 'value < threshold',
              severity: 'urgent',
              notify_channels: ['email'],
              evaluation_window: '5m',
            },
          ],
        },
      };
      const { error } = metricDefinitionSchema.validate(withBadAlert);
      expect(error).toBeDefined();
      expect(error?.message).toContain('severity');
    });
  });

  describe('Metric Update Schema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        metric_id: 'METRIC-001',
        name: 'Updated Name',
        description: 'Updated description',
      };
      const { error } = metricUpdateSchema.validate(partialUpdate);
      expect(error).toBeUndefined();
    });

    it('should require metric_id', () => {
      const { error } = metricUpdateSchema.validate({ name: 'Updated' });
      expect(error).toBeDefined();
      expect(error?.message).toContain('metric_id');
    });
  });

  describe('Metric Query Schema', () => {
    it('should validate query parameters', () => {
      const query = {
        category: 'KPI',
        tier: 'Tier-1',
        limit: 50,
        offset: 0,
      };
      const { error } = metricQuerySchema.validate(query);
      expect(error).toBeUndefined();
    });

    it('should apply default values', () => {
      const { value } = metricQuerySchema.validate({});
      expect(value.limit).toBe(100);
      expect(value.offset).toBe(0);
    });

    it('should reject invalid tier', () => {
      const { error } = metricQuerySchema.validate({ tier: 'Tier-4' });
      expect(error).toBeDefined();
    });

    it('should reject limit above maximum', () => {
      const { error } = metricQuerySchema.validate({ limit: 2000 });
      expect(error).toBeDefined();
    });

    it('should handle tags as string or array', () => {
      const { error: error1 } = metricQuerySchema.validate({ tags: 'tag1' });
      expect(error1).toBeUndefined();

      const { error: error2 } = metricQuerySchema.validate({ tags: ['tag1', 'tag2'] });
      expect(error2).toBeUndefined();
    });
  });

  describe('Domain Schema', () => {
    const validDomain = {
      domain_id: 'DOMAIN-001',
      name: 'Test Domain',
      description: 'A test domain',
      owner_team: 'Team A',
      status: 'active',
    };

    it('should validate a complete domain', () => {
      const { error } = domainSchema.validate(validDomain);
      expect(error).toBeUndefined();
    });

    it('should apply default status', () => {
      const { domain_id, name, description, owner_team } = validDomain;
      const { value } = domainSchema.validate({
        domain_id,
        name,
        description,
        owner_team,
      });
      expect(value.status).toBe('active');
    });

    it('should reject invalid status', () => {
      const invalid = { ...validDomain, status: 'invalid' };
      const { error } = domainSchema.validate(invalid);
      expect(error).toBeDefined();
    });

    it('should require domain_id', () => {
      const { domain_id, ...incomplete } = validDomain;
      const { error } = domainSchema.validate(incomplete);
      expect(error).toBeDefined();
      expect(error?.message).toContain('domain_id');
    });
  });

  describe('Domain Update Schema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        domain_id: 'DOMAIN-001',
        name: 'Updated Name',
      };
      const { error } = domainUpdateSchema.validate(partialUpdate);
      expect(error).toBeUndefined();
    });
  });

  describe('Objective Schema', () => {
    const validObjective = {
      objective_id: 'OBJ-001',
      name: 'Test Objective',
      description: 'A test objective',
      timeframe: {
        start: '2025-01-01',
        end: '2025-12-31',
      },
      owner_team: 'Team A',
      status: 'active',
      key_results: [
        {
          kr_id: 'KR-001',
          name: 'Key Result 1',
          description: 'First key result',
          target_value: 100,
          baseline_value: 50,
          unit: 'count',
          direction: 'increase',
          current_value: null,
          metric_ids: ['METRIC-001'],
        },
      ],
    };

    it('should validate a complete objective', () => {
      const { error } = objectiveSchema.validate(validObjective);
      expect(error).toBeUndefined();
    });

    it('should require at least one key result', () => {
      const invalid = { ...validObjective, key_results: [] };
      const { error } = objectiveSchema.validate(invalid);
      expect(error).toBeDefined();
      expect(error?.message).toContain('key_results');
    });

    it('should reject timeframe with start after end', () => {
      const invalid = {
        ...validObjective,
        timeframe: {
          start: '2025-12-31',
          end: '2025-01-01',
        },
      };
      const { error } = objectiveSchema.validate(invalid);
      expect(error).toBeDefined();
      expect(error?.message).toContain('before');
    });

    it('should reject invalid status', () => {
      const invalid = { ...validObjective, status: 'invalid' };
      const { error } = objectiveSchema.validate(invalid);
      expect(error).toBeDefined();
    });

    it('should reject key result with invalid direction', () => {
      const invalid = {
        ...validObjective,
        key_results: [
          {
            ...validObjective.key_results[0],
            direction: 'stable',
          },
        ],
      };
      const { error } = objectiveSchema.validate(invalid);
      expect(error).toBeDefined();
    });
  });

  describe('Authentication Schemas', () => {
    describe('Login Schema', () => {
      it('should validate login credentials', () => {
        const credentials = {
          username: 'testuser',
          password: 'Password123!',
        };
        const { error } = loginSchema.validate(credentials);
        expect(error).toBeUndefined();
      });

      it('should reject short username', () => {
        const { error } = loginSchema.validate({
          username: 'ab',
          password: 'Password123!',
        });
        expect(error).toBeDefined();
      });

      it('should reject short password', () => {
        const { error } = loginSchema.validate({
          username: 'testuser',
          password: 'short',
        });
        expect(error).toBeDefined();
      });
    });

    describe('Register Schema', () => {
      it('should validate registration data', () => {
        const registration = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
          full_name: 'Test User',
          role: 'viewer',
        };
        const { error } = registerSchema.validate(registration);
        expect(error).toBeUndefined();
      });

      it('should reject invalid username characters', () => {
        const { error } = registerSchema.validate({
          username: 'test@user',
          email: 'test@example.com',
          password: 'Password123!',
          full_name: 'Test User',
        });
        expect(error).toBeDefined();
        expect(error?.message).toContain('letters, numbers');
      });

      it('should reject weak password', () => {
        const { error } = registerSchema.validate({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password',
          full_name: 'Test User',
        });
        expect(error).toBeDefined();
        expect(error?.message).toContain('uppercase');
      });

      it('should reject invalid email', () => {
        const { error } = registerSchema.validate({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Password123!',
          full_name: 'Test User',
        });
        expect(error).toBeDefined();
      });

      it('should apply default role', () => {
        const { value } = registerSchema.validate({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
          full_name: 'Test User',
        });
        expect(value.role).toBe('viewer');
      });

      it('should reject invalid role', () => {
        const { error } = registerSchema.validate({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!',
          full_name: 'Test User',
          role: 'superuser',
        });
        expect(error).toBeDefined();
      });
    });

    describe('Change Password Schema', () => {
      it('should validate password change', () => {
        const { error } = changePasswordSchema.validate({
          current_password: 'OldPass123!',
          new_password: 'NewPass123!',
        });
        expect(error).toBeUndefined();
      });

      it('should reject weak new password', () => {
        const { error } = changePasswordSchema.validate({
          current_password: 'OldPass123!',
          new_password: 'newpass',
        });
        expect(error).toBeDefined();
      });
    });

    describe('Refresh Token Schema', () => {
      it('should validate refresh token', () => {
        const { error } = refreshTokenSchema.validate({
          refresh_token: 'some-token-value',
        });
        expect(error).toBeUndefined();
      });

      it('should require refresh_token', () => {
        const { error } = refreshTokenSchema.validate({});
        expect(error).toBeDefined();
      });
    });
  });

  describe('API Key Schemas', () => {
    it('should validate API key creation', () => {
      const apiKey = {
        name: 'Test API Key',
        description: 'For testing',
        expires_at: '2025-12-31',
        scopes: ['metrics:read', 'metrics:write'],
      };
      const { error } = apiKeyCreateSchema.validate(apiKey);
      expect(error).toBeUndefined();
    });

    it('should require at least one scope', () => {
      const { error } = apiKeyCreateSchema.validate({
        name: 'Test Key',
        scopes: [],
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain('scopes');
    });

    it('should reject invalid scope', () => {
      const { error } = apiKeyCreateSchema.validate({
        name: 'Test Key',
        scopes: ['invalid:scope'],
      });
      expect(error).toBeDefined();
    });

    it('should allow null expires_at', () => {
      const { error } = apiKeyCreateSchema.validate({
        name: 'Test Key',
        scopes: ['metrics:read'],
        expires_at: null,
      });
      expect(error).toBeUndefined();
    });
  });

  describe('User Management Schemas', () => {
    describe('User Update Schema', () => {
      it('should validate user updates', () => {
        const update = {
          email: 'newemail@example.com',
          role: 'editor',
        };
        const { error } = userUpdateSchema.validate(update);
        expect(error).toBeUndefined();
      });

      it('should require at least one field', () => {
        const { error } = userUpdateSchema.validate({});
        expect(error).toBeDefined();
      });

      it('should reject invalid role', () => {
        const { error } = userUpdateSchema.validate({ role: 'superadmin' });
        expect(error).toBeDefined();
      });

      it('should reject invalid status', () => {
        const { error } = userUpdateSchema.validate({ status: 'deleted' });
        expect(error).toBeDefined();
      });
    });

    describe('User List Query Schema', () => {
      it('should validate query parameters', () => {
        const query = {
          limit: 50,
          offset: 10,
          role: 'admin',
          status: 'active',
        };
        const { error } = userListQuerySchema.validate(query);
        expect(error).toBeUndefined();
      });

      it('should apply default values', () => {
        const { value } = userListQuerySchema.validate({});
        expect(value.limit).toBe(100);
        expect(value.offset).toBe(0);
      });
    });
  });

  describe('Database Config Schema', () => {
    it('should validate database configuration', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
      };
      const { error } = databaseConfigSchema.validate(config);
      expect(error).toBeUndefined();
    });

    it('should apply default values', () => {
      const { value } = databaseConfigSchema.validate({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: '',
      });
      expect(value.ssl).toBe(false);
      expect(value.max).toBe(10);
    });

    it('should reject invalid hostname', () => {
      const { error } = databaseConfigSchema.validate({
        host: 'invalid host name',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: '',
      });
      expect(error).toBeDefined();
    });

    it('should reject invalid port', () => {
      const { error } = databaseConfigSchema.validate({
        host: 'localhost',
        port: 70000,
        database: 'testdb',
        user: 'testuser',
        password: '',
      });
      expect(error).toBeDefined();
    });
  });

  describe('Bulk Operation Schemas', () => {
    describe('Bulk Delete Schema', () => {
      it('should validate bulk delete', () => {
        const { error } = bulkDeleteSchema.validate({
          ids: ['ID-001', 'ID-002'],
        });
        expect(error).toBeUndefined();
      });

      it('should require at least one ID', () => {
        const { error } = bulkDeleteSchema.validate({ ids: [] });
        expect(error).toBeDefined();
      });

      it('should reject more than 100 IDs', () => {
        const ids = Array.from({ length: 101 }, (_, i) => `ID-${i}`);
        const { error } = bulkDeleteSchema.validate({ ids });
        expect(error).toBeDefined();
      });
    });
  });

  describe('Import/Export Schemas', () => {
    describe('Import Data Schema', () => {
      it('should validate import with object data', () => {
        const importData = {
          format: 'json',
          data: {
            metrics: [],
            domains: [],
            objectives: [],
          },
          mode: 'merge',
        };
        const { error } = importDataSchema.validate(importData);
        expect(error).toBeUndefined();
      });

      it('should validate import with string data', () => {
        const importData = {
          format: 'yaml',
          data: 'metrics: []',
          mode: 'replace',
        };
        const { error } = importDataSchema.validate(importData);
        expect(error).toBeUndefined();
      });

      it('should apply default values', () => {
        const { value } = importDataSchema.validate({
          data: { metrics: [] },
        });
        expect(value.format).toBe('json');
        expect(value.mode).toBe('merge');
        expect(value.validate_only).toBe(false);
      });

      it('should reject invalid mode', () => {
        const { error } = importDataSchema.validate({
          data: {},
          mode: 'delete',
        });
        expect(error).toBeDefined();
      });
    });

    describe('Export Format Schema', () => {
      it('should validate export format', () => {
        const exportFormat = {
          format: 'json',
          include: {
            metrics: true,
            domains: false,
          },
        };
        const { error } = exportFormatSchema.validate(exportFormat);
        expect(error).toBeUndefined();
      });

      it('should apply default values', () => {
        const { value } = exportFormatSchema.validate({});
        expect(value.format).toBe('json');
        expect(value.include).toEqual({});
        expect(value.filters).toEqual({});
      });

      it('should reject invalid format', () => {
        const { error } = exportFormatSchema.validate({ format: 'xml' });
        expect(error).toBeDefined();
      });
    });
  });
});
