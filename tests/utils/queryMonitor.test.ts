import {
    getQueryMonitor,
    QueryMonitor
} from '../../src/utils/queryMonitor';

describe('QueryMonitor', () => {
  let monitor: QueryMonitor;

  beforeEach(() => {
    monitor = QueryMonitor.getInstance();
    monitor.clear();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = QueryMonitor.getInstance();
      const instance2 = QueryMonitor.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should be accessible via getQueryMonitor helper', () => {
      const instance = getQueryMonitor();
      
      expect(instance).toBeInstanceOf(QueryMonitor);
      expect(instance).toBe(QueryMonitor.getInstance());
    });
  });

  describe('recordQuery', () => {
    it('should record query execution', () => {
      monitor.recordQuery('SELECT * FROM users', 50);
      
      const stats = monitor.getStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.avgDuration).toBe(50);
    });

    it('should record multiple queries', () => {
      monitor.recordQuery('SELECT * FROM users', 50);
      monitor.recordQuery('INSERT INTO posts', 100);
      monitor.recordQuery('UPDATE comments', 75);
      
      const stats = monitor.getStats();
      expect(stats.totalQueries).toBe(3);
      expect(stats.avgDuration).toBe(75);
    });

    it('should track slow queries', () => {
      monitor.recordQuery('FAST QUERY', 10);
      monitor.recordQuery('SLOW QUERY', 150);
      monitor.recordQuery('ANOTHER FAST', 20);
      
      const stats = monitor.getStats();
      expect(stats.slowQueries).toBe(1);
    });

    it('should record query parameters', () => {
      monitor.recordQuery('SELECT * FROM users WHERE id = $1', 50, ['user-123']);
      
      const recent = monitor.getRecentQueries(1);
      expect(recent[0].params).toEqual(['user-123']);
    });

    it('should capture stack trace for slow queries', () => {
      monitor.recordQuery('VERY SLOW QUERY', 200);
      
      const slowQueries = monitor.getSlowQueries(1);
      expect(slowQueries[0].stack).toBeDefined();
    });

    it('should not capture stack trace for fast queries', () => {
      monitor.recordQuery('FAST QUERY', 50);
      
      const recent = monitor.getRecentQueries(1);
      expect(recent[0].stack).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return default stats when no queries recorded', () => {
      const stats = monitor.getStats();
      
      expect(stats).toEqual({
        totalQueries: 0,
        slowQueries: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
      });
    });

    it('should calculate average duration correctly', () => {
      monitor.recordQuery('Q1', 100);
      monitor.recordQuery('Q2', 200);
      monitor.recordQuery('Q3', 300);
      
      const stats = monitor.getStats();
      expect(stats.avgDuration).toBe(200);
    });

    it('should track min and max durations', () => {
      monitor.recordQuery('FAST', 10);
      monitor.recordQuery('MEDIUM', 100);
      monitor.recordQuery('SLOW', 500);
      
      const stats = monitor.getStats();
      expect(stats.minDuration).toBe(10);
      expect(stats.maxDuration).toBe(500);
    });

    it('should calculate percentiles correctly', () => {
      // Record 100 queries with durations 1-100
      for (let i = 1; i <= 100; i++) {
        monitor.recordQuery(`QUERY ${i}`, i);
      }
      
      const stats = monitor.getStats();
      expect(stats.p50Duration).toBeCloseTo(50, 0);
      expect(stats.p95Duration).toBeCloseTo(95, 0);
      expect(stats.p99Duration).toBeCloseTo(99, 0);
    });
  });

  describe('getSlowQueries', () => {
    beforeEach(() => {
      monitor.recordQuery('FAST1', 50);
      monitor.recordQuery('SLOW1', 150);
      monitor.recordQuery('FAST2', 75);
      monitor.recordQuery('SLOW2', 200);
      monitor.recordQuery('SLOW3', 180);
    });

    it('should return only slow queries', () => {
      const slowQueries = monitor.getSlowQueries();
      
      expect(slowQueries.length).toBe(3);
      expect(slowQueries.every(q => q.duration > 100)).toBe(true);
    });

    it('should return slow queries sorted by duration descending', () => {
      const slowQueries = monitor.getSlowQueries();
      
      expect(slowQueries[0].duration).toBe(200);
      expect(slowQueries[1].duration).toBe(180);
      expect(slowQueries[2].duration).toBe(150);
    });

    it('should respect limit parameter', () => {
      monitor.recordQuery('SLOW4', 160);
      monitor.recordQuery('SLOW5', 170);
      
      const slowQueries = monitor.getSlowQueries(2);
      expect(slowQueries.length).toBe(2);
    });

    it('should return empty array when no slow queries', () => {
      monitor.clear();
      monitor.recordQuery('FAST1', 10);
      monitor.recordQuery('FAST2', 20);
      
      const slowQueries = monitor.getSlowQueries();
      expect(slowQueries).toEqual([]);
    });
  });

  describe('getRecentQueries', () => {
    beforeEach(() => {
      for (let i = 1; i <= 30; i++) {
        monitor.recordQuery(`QUERY ${i}`, 50);
      }
    });

    it('should return recent queries with default limit', () => {
      const recent = monitor.getRecentQueries();
      
      expect(recent.length).toBe(20);
    });

    it('should return queries in reverse chronological order', () => {
      const recent = monitor.getRecentQueries(3);
      
      expect(recent[0].query).toContain('QUERY 30');
      expect(recent[1].query).toContain('QUERY 29');
      expect(recent[2].query).toContain('QUERY 28');
    });

    it('should respect custom limit', () => {
      const recent = monitor.getRecentQueries(5);
      
      expect(recent.length).toBe(5);
    });

    it('should return all queries if limit exceeds total', () => {
      monitor.clear();
      monitor.recordQuery('Q1', 50);
      monitor.recordQuery('Q2', 60);
      
      const recent = monitor.getRecentQueries(100);
      expect(recent.length).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all recorded metrics', () => {
      monitor.recordQuery('Q1', 50);
      monitor.recordQuery('Q2', 100);
      
      monitor.clear();
      
      const stats = monitor.getStats();
      expect(stats.totalQueries).toBe(0);
      expect(monitor.getRecentQueries()).toEqual([]);
    });
  });

  describe('getDistribution', () => {
    it('should group queries into duration buckets', () => {
      monitor.recordQuery('VERY_FAST', 5);
      monitor.recordQuery('FAST', 30);
      monitor.recordQuery('MEDIUM', 75);
      monitor.recordQuery('SLOW', 200);
      monitor.recordQuery('VERY_SLOW', 600);
      
      const distribution = monitor.getDistribution();
      
      expect(distribution['0-10ms']).toBe(1);
      expect(distribution['10-50ms']).toBe(1);
      expect(distribution['50-100ms']).toBe(1);
      expect(distribution['100-500ms']).toBe(1);
      expect(distribution['500ms+']).toBe(1);
    });

    it('should return zero counts for empty buckets', () => {
      monitor.recordQuery('FAST', 5);
      
      const distribution = monitor.getDistribution();
      
      expect(distribution['0-10ms']).toBe(1);
      expect(distribution['10-50ms']).toBe(0);
      expect(distribution['50-100ms']).toBe(0);
      expect(distribution['100-500ms']).toBe(0);
      expect(distribution['500ms+']).toBe(0);
    });
  });

  describe('getQueryPatterns', () => {
    it('should group similar queries together', () => {
      monitor.recordQuery('SELECT * FROM users WHERE id = $1', 50, [1]);
      monitor.recordQuery('SELECT * FROM users WHERE id = $1', 60, [2]);
      monitor.recordQuery('SELECT * FROM posts WHERE id = $1', 70, [3]);
      
      const patterns = monitor.getQueryPatterns();
      
      expect(patterns.size).toBe(2);
    });

    it('should normalize query parameters', () => {
      monitor.recordQuery("SELECT * FROM users WHERE name = 'John'", 50);
      monitor.recordQuery("SELECT * FROM users WHERE name = 'Jane'", 60);
      
      const patterns = monitor.getQueryPatterns();
      const patternArray = Array.from(patterns.entries());
      
      expect(patterns.size).toBe(1);
      expect(patternArray[0][1]).toBe(2); // Count should be 2
    });

    it('should return patterns sorted by frequency', () => {
      monitor.recordQuery('SELECT * FROM users', 50);
      monitor.recordQuery('SELECT * FROM users', 50);
      monitor.recordQuery('SELECT * FROM users', 50);
      monitor.recordQuery('SELECT * FROM posts', 50);
      monitor.recordQuery('SELECT * FROM posts', 50);
      
      const patterns = monitor.getQueryPatterns();
      const patternArray = Array.from(patterns.entries());
      
      expect(patternArray[0][1]).toBe(3); // Most frequent first
      expect(patternArray[1][1]).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle very long queries', () => {
      const longQuery = 'SELECT * FROM users WHERE '.concat('id = 1 OR '.repeat(200));
      
      monitor.recordQuery(longQuery, 50);
      
      const recent = monitor.getRecentQueries(1);
      expect(recent[0].query.length).toBeLessThanOrEqual(500);
    });

    it('should handle long parameter values', () => {
      const longParam = 'x'.repeat(200);
      
      monitor.recordQuery('SELECT * FROM users WHERE data = $1', 50, [longParam]);
      
      const recent = monitor.getRecentQueries(1);
      const param = recent[0].params?.[0] as string;
      expect(param.length).toBeLessThanOrEqual(103); // 100 + '...'
    });

    it('should handle zero duration', () => {
      monitor.recordQuery('INSTANT', 0);
      
      const stats = monitor.getStats();
      expect(stats.minDuration).toBe(0);
      expect(stats.avgDuration).toBe(0);
    });

    it('should handle negative duration', () => {
      monitor.recordQuery('NEGATIVE', -10);
      
      const stats = monitor.getStats();
      expect(stats.totalQueries).toBe(1);
    });

    it('should trim metrics array when it exceeds max size', () => {
      // Record more than max size (default 1000)
      for (let i = 0; i < 1100; i++) {
        monitor.recordQuery(`QUERY ${i}`, 50);
      }
      
      const stats = monitor.getStats();
      expect(stats.totalQueries).toBeLessThanOrEqual(1000);
    });
  });

  describe('performance', () => {
    it('should handle recording many queries efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        monitor.recordQuery(`QUERY ${i}`, Math.random() * 100);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should calculate stats efficiently on large dataset', () => {
      for (let i = 0; i < 1000; i++) {
        monitor.recordQuery(`QUERY ${i}`, Math.random() * 200);
      }
      
      const startTime = Date.now();
      monitor.getStats();
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Stats should be fast
    });
  });
});
