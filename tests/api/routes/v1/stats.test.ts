import express, { Express } from 'express';
import request from 'supertest';
import { createStatsRouter } from '../../../../src/api/routes/v1/stats';
import { cacheService } from '../../../../src/cache/CacheService';
import { MetricDefinition } from '../../../../src/models/MetricDefinition';
import { IMetricStore } from '../../../../src/storage';
import { getQueryMonitor } from '../../../../src/utils/queryMonitor';

jest.mock('../../../../src/cache/CacheService');
jest.mock('../../../../src/utils/queryMonitor');

describe('Stats API Routes', () => {
  let app: Express;
  let mockStore: jest.Mocked<IMetricStore>;
  let mockMetrics: MetricDefinition[];

  beforeEach(() => {
    // Create mock metrics with minimal required fields
    mockMetrics = [
      {
        metric_id: 'M1',
        name: 'Revenue',
        short_name: 'Revenue',
        description: 'Total revenue',
        category: 'financial',
        metric_type: 'gauge',
        tier: 'tier_1',
        business_domain: 'sales',
        tags: [],
        alignment: {} as any,
        definition: {} as any,
        data: {} as any,
        governance: {} as any,
        dimensions: [],
        targets_and_alerts: {} as any,
        visualization: {} as any,
        relationships: {} as any,
        operational_usage: {} as any,
        metadata: {
          notes: '',
          example_queries: [],
          version: '1.0.0',
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          created_by: 'system',
          last_updated_by: 'system',
          change_history: [],
        },
      },
      {
        metric_id: 'M2',
        name: 'Active Users',
        short_name: 'Active Users',
        description: 'Number of active users',
        category: 'engagement',
        metric_type: 'counter',
        tier: 'tier_1',
        business_domain: 'product',
        tags: [],
        alignment: {} as any,
        definition: {} as any,
        data: {} as any,
        governance: {} as any,
        dimensions: [],
        targets_and_alerts: {} as any,
        visualization: {} as any,
        relationships: {} as any,
        operational_usage: {} as any,
        metadata: {
          notes: '',
          example_queries: [],
          version: '1.0.0',
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          created_by: 'system',
          last_updated_by: 'system',
          change_history: [],
        },
      },
      {
        metric_id: 'M3',
        name: 'Conversion Rate',
        short_name: 'Conv Rate',
        description: 'Conversion rate',
        category: 'financial',
        metric_type: 'gauge',
        tier: 'tier_2',
        business_domain: 'sales',
        tags: [],
        alignment: {} as any,
        definition: {} as any,
        data: {} as any,
        governance: {} as any,
        dimensions: [],
        targets_and_alerts: {} as any,
        visualization: {} as any,
        relationships: {} as any,
        operational_usage: {} as any,
        metadata: {
          notes: '',
          example_queries: [],
          version: '1.0.0',
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          created_by: 'system',
          last_updated_by: 'system',
          change_history: [],
        },
      },
    ] as MetricDefinition[];

    // Create mock store
    mockStore = {
      findAll: jest.fn().mockResolvedValue(mockMetrics),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      search: jest.fn(),
    } as any;

    // Setup express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/stats', createStatsRouter(() => mockStore));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/stats', () => {
    it('should return aggregate statistics', async () => {
      const response = await request(app)
        .get('/api/v1/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        total: 3,
        by_category: {
          financial: 2,
          engagement: 1,
        },
        by_type: {
          gauge: 2,
          counter: 1,
        },
        by_tier: {
          'tier_1': 2,
          'tier_2': 1,
        },
        by_domain: {
          sales: 2,
          product: 1,
        },
      });
    });

    it('should handle empty metrics', async () => {
      mockStore.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        total: 0,
        by_category: {},
        by_type: {},
        by_tier: {},
        by_domain: {},
      });
    });

    it('should handle store errors', async () => {
      mockStore.findAll.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate statistics');
    });
  });

  describe('GET /api/v1/stats/performance', () => {
    beforeEach(() => {
      const mockQueryMonitor = {
        getStats: jest.fn().mockReturnValue({
          totalQueries: 100,
          avgDuration: 45.678,
          minDuration: 10.123,
          maxDuration: 200.456,
          p50Duration: 40.789,
          p95Duration: 150.234,
          p99Duration: 180.567,
        }),
        getDistribution: jest.fn().mockReturnValue({
          fast: 80,
          medium: 15,
          slow: 5,
        }),
      };

      (getQueryMonitor as jest.Mock).mockReturnValue(mockQueryMonitor);

      (cacheService.getStats as jest.Mock).mockResolvedValue({
        hits: 500,
        misses: 100,
        hitRate: 0.833,
        size: 50,
      });
    });

    it('should return performance statistics', async () => {
      const response = await request(app)
        .get('/api/v1/stats/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.queries).toEqual({
        totalQueries: 100,
        avgDuration: 45.68,
        minDuration: 10.12,
        maxDuration: 200.46,
        p50Duration: 40.79,
        p95Duration: 150.23,
        p99Duration: 180.57,
      });
      expect(response.body.data.distribution).toEqual({
        fast: 80,
        medium: 15,
        slow: 5,
      });
      expect(response.body.data.cache).toEqual({
        hits: 500,
        misses: 100,
        hitRate: 0.833,
        size: 50,
      });
    });

    it('should handle errors getting performance stats', async () => {
      (getQueryMonitor as jest.Mock).mockImplementation(() => {
        throw new Error('Monitor error');
      });

      const response = await request(app)
        .get('/api/v1/stats/performance')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get performance statistics');
    });
  });

  describe('GET /api/v1/stats/performance/slow-queries', () => {
    beforeEach(() => {
      const mockQueryMonitor = {
        getSlowQueries: jest.fn().mockImplementation((limit: number) => [
          {
            query: 'SELECT * FROM metrics WHERE tier = ?',
            duration: 150.456,
            timestamp: new Date('2025-01-01T12:00:00Z'),
            params: ['1'],
          },
          {
            query: 'SELECT COUNT(*) FROM metrics',
            duration: 120.789,
            timestamp: new Date('2025-01-01T12:01:00Z'),
            params: [],
          },
        ].slice(0, limit)),
      };

      (getQueryMonitor as jest.Mock).mockReturnValue(mockQueryMonitor);
    });

    it('should return slow queries with default limit', async () => {
      const response = await request(app)
        .get('/api/v1/stats/performance/slow-queries')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toEqual({
        query: 'SELECT * FROM metrics WHERE tier = ?',
        duration: 150.46,
        timestamp: new Date('2025-01-01T12:00:00Z').toISOString(),
        params: ['1'],
      });
    });

    it('should respect custom limit parameter', async () => {
      const mockQueryMonitor = {
        getSlowQueries: jest.fn().mockReturnValue([
          {
            query: 'SELECT * FROM metrics WHERE tier = ?',
            duration: 150.456,
            timestamp: new Date('2025-01-01T12:00:00Z'),
            params: ['1'],
          },
        ]),
      };

      (getQueryMonitor as jest.Mock).mockReturnValue(mockQueryMonitor);

      const response = await request(app)
        .get('/api/v1/stats/performance/slow-queries?limit=1')
        .expect(200);

      expect(mockQueryMonitor.getSlowQueries).toHaveBeenCalledWith(1);
      expect(response.body.data).toHaveLength(1);
    });

    it('should handle errors getting slow queries', async () => {
      (getQueryMonitor as jest.Mock).mockImplementation(() => {
        throw new Error('Monitor error');
      });

      const response = await request(app)
        .get('/api/v1/stats/performance/slow-queries')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get slow queries');
    });
  });

  describe('GET /api/v1/stats/performance/patterns', () => {
    beforeEach(() => {
      const patterns = new Map([
        ['SELECT * FROM metrics WHERE tier = ?', 45],
        ['SELECT COUNT(*) FROM metrics', 30],
        ['SELECT * FROM metrics WHERE category = ?', 25],
      ]);

      const mockQueryMonitor = {
        getQueryPatterns: jest.fn().mockReturnValue(patterns),
      };

      (getQueryMonitor as jest.Mock).mockReturnValue(mockQueryMonitor);
    });

    it('should return query patterns', async () => {
      const response = await request(app)
        .get('/api/v1/stats/performance/patterns')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toEqual({
        pattern: 'SELECT * FROM metrics WHERE tier = ?',
        count: 45,
      });
      expect(response.body.data[1]).toEqual({
        pattern: 'SELECT COUNT(*) FROM metrics',
        count: 30,
      });
    });

    it('should limit patterns to top 50', async () => {
      const patterns = new Map();
      for (let i = 0; i < 100; i++) {
        patterns.set(`QUERY_${i}`, i);
      }

      const mockQueryMonitor = {
        getQueryPatterns: jest.fn().mockReturnValue(patterns),
      };

      (getQueryMonitor as jest.Mock).mockReturnValue(mockQueryMonitor);

      const response = await request(app)
        .get('/api/v1/stats/performance/patterns')
        .expect(200);

      expect(response.body.data).toHaveLength(50);
    });

    it('should handle errors getting query patterns', async () => {
      (getQueryMonitor as jest.Mock).mockImplementation(() => {
        throw new Error('Monitor error');
      });

      const response = await request(app)
        .get('/api/v1/stats/performance/patterns')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get query patterns');
    });
  });
});
