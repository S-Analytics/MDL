/**
 * Custom Span Utilities
 * 
 * Helper functions for creating custom spans in the MDL API.
 */

import { context, Span, SpanStatusCode, trace } from '@opentelemetry/api';

/**
 * Get the current tracer for MDL components
 * 
 * @param componentName - Name of the component (e.g., 'storage', 'cache', 'auth')
 */
export function getTracer(componentName: string) {
  return trace.getTracer(`mdl-${componentName}`, '1.0.0');
}

/**
 * Create a span for a storage operation
 * 
 * @param operation - Operation name (e.g., 'findById', 'create', 'update')
 * @param attributes - Additional attributes for the span
 */
export function createStorageSpan(
  operation: string,
  attributes: Record<string, string | number | boolean> = {}
): Span {
  const tracer = getTracer('storage');
  return tracer.startSpan(`Storage.${operation}`, {
    attributes: {
      'component': 'storage',
      'db.system': 'postgresql',
      ...attributes,
    },
  });
}

/**
 * Create a span for a cache operation
 * 
 * @param operation - Operation name (e.g., 'get', 'set', 'delete')
 * @param attributes - Additional attributes for the span
 */
export function createCacheSpan(
  operation: string,
  attributes: Record<string, string | number | boolean> = {}
): Span {
  const tracer = getTracer('cache');
  return tracer.startSpan(`Cache.${operation}`, {
    attributes: {
      'component': 'cache',
      'cache.system': 'memory',
      ...attributes,
    },
  });
}

/**
 * Create a span for a validation operation
 * 
 * @param operation - Operation name (e.g., 'validateMetric', 'validateSchema')
 * @param attributes - Additional attributes for the span
 */
export function createValidationSpan(
  operation: string,
  attributes: Record<string, string | number | boolean> = {}
): Span {
  const tracer = getTracer('validation');
  return tracer.startSpan(`Validation.${operation}`, {
    attributes: {
      'component': 'validation',
      ...attributes,
    },
  });
}

/**
 * Create a span for an OPA policy evaluation
 * 
 * @param policy - Policy name
 * @param attributes - Additional attributes for the span
 */
export function createOPASpan(
  policy: string,
  attributes: Record<string, string | number | boolean> = {}
): Span {
  const tracer = getTracer('opa');
  return tracer.startSpan(`OPA.evaluate`, {
    attributes: {
      'component': 'opa',
      'opa.policy': policy,
      ...attributes,
    },
  });
}

/**
 * Execute a function within a span
 * 
 * Automatically handles span lifecycle, status, and error recording.
 * 
 * @param span - The span to use
 * @param fn - The function to execute
 * @returns The result of the function
 */
export async function executeWithSpan<T>(
  span: Span,
  fn: () => Promise<T>
): Promise<T> {
  const ctx = trace.setSpan(context.active(), span);
  
  try {
    const result = await context.with(ctx, fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Execute a synchronous function within a span
 * 
 * @param span - The span to use
 * @param fn - The function to execute
 * @returns The result of the function
 */
export function executeWithSpanSync<T>(
  span: Span,
  fn: () => T
): T {
  const ctx = trace.setSpan(context.active(), span);
  
  try {
    const result = context.with(ctx, fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add an event to the current span
 * 
 * @param name - Event name
 * @param attributes - Event attributes
 */
export function addSpanEvent(
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Set an attribute on the current span
 * 
 * @param key - Attribute key
 * @param value - Attribute value
 */
export function setSpanAttribute(
  key: string,
  value: string | number | boolean
): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute(key, value);
  }
}

/**
 * Record an exception in the current span
 * 
 * @param error - The error to record
 */
export function recordSpanException(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}
