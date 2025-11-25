import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import {
    addSpanEvent,
    createCacheSpan,
    createOPASpan,
    createStorageSpan,
    createValidationSpan,
    executeWithSpan,
    executeWithSpanSync,
    getTracer,
    recordSpanException,
    setSpanAttribute,
} from '../../src/tracing/spans';

describe('Tracing Spans', () => {
  let mockTracer: any;
  let mockSpan: any;

  beforeEach(() => {
    mockSpan = {
      setStatus: jest.fn(),
      setAttribute: jest.fn(),
      addEvent: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    };

    mockTracer = {
      startSpan: jest.fn().mockReturnValue(mockSpan),
    };

    jest.spyOn(trace, 'getTracer').mockReturnValue(mockTracer);
    jest.spyOn(trace, 'setSpan').mockImplementation((ctx, span) => ctx);
    jest.spyOn(trace, 'getActiveSpan').mockReturnValue(mockSpan);
    jest.spyOn(context, 'with').mockImplementation((ctx, fn) => fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTracer', () => {
    it('should get tracer with component name', () => {
      getTracer('storage');
      
      expect(trace.getTracer).toHaveBeenCalledWith('mdl-storage', '1.0.0');
    });

    it('should work with different component names', () => {
      getTracer('cache');
      getTracer('auth');
      
      expect(trace.getTracer).toHaveBeenCalledWith('mdl-cache', '1.0.0');
      expect(trace.getTracer).toHaveBeenCalledWith('mdl-auth', '1.0.0');
    });
  });

  describe('createStorageSpan', () => {
    it('should create storage span with operation name', () => {
      createStorageSpan('findById');
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('Storage.findById', {
        attributes: {
          component: 'storage',
          'db.system': 'postgresql',
        },
      });
    });

    it('should include custom attributes', () => {
      createStorageSpan('create', { 'db.table': 'users', 'user.id': '123' });
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('Storage.create', {
        attributes: {
          component: 'storage',
          'db.system': 'postgresql',
          'db.table': 'users',
          'user.id': '123',
        },
      });
    });
  });

  describe('createCacheSpan', () => {
    it('should create cache span with operation name', () => {
      createCacheSpan('get');
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('Cache.get', {
        attributes: {
          component: 'cache',
          'cache.system': 'memory',
        },
      });
    });

    it('should include custom attributes', () => {
      createCacheSpan('set', { 'cache.key': 'user:123', 'cache.ttl': 3600 });
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('Cache.set', {
        attributes: {
          component: 'cache',
          'cache.system': 'memory',
          'cache.key': 'user:123',
          'cache.ttl': 3600,
        },
      });
    });
  });

  describe('createValidationSpan', () => {
    it('should create validation span', () => {
      createValidationSpan('validateMetric');
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('Validation.validateMetric', {
        attributes: {
          component: 'validation',
        },
      });
    });

    it('should include custom attributes', () => {
      createValidationSpan('validateSchema', { 'schema.type': 'metric', valid: true });
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('Validation.validateSchema', {
        attributes: {
          component: 'validation',
          'schema.type': 'metric',
          valid: true,
        },
      });
    });
  });

  describe('createOPASpan', () => {
    it('should create OPA span with policy name', () => {
      createOPASpan('metrics.read');
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('OPA.evaluate', {
        attributes: {
          component: 'opa',
          'opa.policy': 'metrics.read',
        },
      });
    });

    it('should include custom attributes', () => {
      createOPASpan('domains.write', { 'user.role': 'admin', allowed: true });
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('OPA.evaluate', {
        attributes: {
          component: 'opa',
          'opa.policy': 'domains.write',
          'user.role': 'admin',
          allowed: true,
        },
      });
    });
  });

  describe('executeWithSpan', () => {
    it('should execute async function successfully', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      
      const result = await executeWithSpan(mockSpan, fn);
      
      expect(result).toBe('result');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle errors and record exception', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      
      await expect(executeWithSpan(mockSpan, fn)).rejects.toThrow('Test error');
      
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Test error',
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should end span even if function throws', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Test'));
      
      await expect(executeWithSpan(mockSpan, fn)).rejects.toThrow();
      
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should set span context', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      
      await executeWithSpan(mockSpan, fn);
      
      expect(trace.setSpan).toHaveBeenCalled();
      expect(context.with).toHaveBeenCalled();
    });
  });

  describe('executeWithSpanSync', () => {
    it('should execute sync function successfully', () => {
      const fn = jest.fn().mockReturnValue('result');
      
      const result = executeWithSpanSync(mockSpan, fn);
      
      expect(result).toBe('result');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle errors and record exception', () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockImplementation(() => {
        throw error;
      });
      
      expect(() => executeWithSpanSync(mockSpan, fn)).toThrow('Test error');
      
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Test error',
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should end span even if function throws', () => {
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('Test');
      });
      
      expect(() => executeWithSpanSync(mockSpan, fn)).toThrow();
      
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('addSpanEvent', () => {
    it('should add event to active span', () => {
      addSpanEvent('user.created', { 'user.id': '123' });
      
      expect(mockSpan.addEvent).toHaveBeenCalledWith('user.created', { 'user.id': '123' });
    });

    it('should add event without attributes', () => {
      addSpanEvent('cache.hit');
      
      expect(mockSpan.addEvent).toHaveBeenCalledWith('cache.hit', undefined);
    });

    it('should handle no active span gracefully', () => {
      jest.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined);
      
      expect(() => addSpanEvent('test')).not.toThrow();
    });
  });

  describe('setSpanAttribute', () => {
    it('should set string attribute on active span', () => {
      setSpanAttribute('user.name', 'John');
      
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('user.name', 'John');
    });

    it('should set number attribute on active span', () => {
      setSpanAttribute('count', 42);
      
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('count', 42);
    });

    it('should set boolean attribute on active span', () => {
      setSpanAttribute('success', true);
      
      expect(mockSpan.setAttribute).toHaveBeenCalledWith('success', true);
    });

    it('should handle no active span gracefully', () => {
      jest.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined);
      
      expect(() => setSpanAttribute('test', 'value')).not.toThrow();
    });
  });

  describe('recordSpanException', () => {
    it('should record exception on active span', () => {
      const error = new Error('Test error');
      
      recordSpanException(error);
      
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Test error',
      });
    });

    it('should handle no active span gracefully', () => {
      jest.spyOn(trace, 'getActiveSpan').mockReturnValue(undefined);
      const error = new Error('Test');
      
      expect(() => recordSpanException(error)).not.toThrow();
    });

    it('should handle error with custom message', () => {
      const error = new Error('Custom error message');
      
      recordSpanException(error);
      
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Custom error message',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle null attributes in createStorageSpan', () => {
      createStorageSpan('operation', {});
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('Storage.operation', {
        attributes: {
          component: 'storage',
          'db.system': 'postgresql',
        },
      });
    });

    it('should handle different attribute types', () => {
      createCacheSpan('set', {
        string: 'value',
        number: 123,
        boolean: true,
      });
      
      expect(mockTracer.startSpan).toHaveBeenCalledWith('Cache.set', {
        attributes: {
          component: 'cache',
          'cache.system': 'memory',
          string: 'value',
          number: 123,
          boolean: true,
        },
      });
    });

    it('should handle non-Error objects in executeWithSpan', async () => {
      const fn = jest.fn().mockRejectedValue('string error');
      
      await expect(executeWithSpan(mockSpan, fn)).rejects.toBe('string error');
      
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'string error',
      });
    });

    it('should handle non-Error objects in executeWithSpanSync', () => {
      const fn = jest.fn().mockImplementation(() => {
        throw 'string error';
      });
      
      expect(() => executeWithSpanSync(mockSpan, fn)).toThrow('string error');
      
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'string error',
      });
    });
  });
});
