import { NextFunction, Request, Response } from 'express';
import { metricsService } from '../metrics/MetricsService';

/**
 * Middleware to record HTTP request metrics
 * 
 * Records:
 * - Request count by method, route, and status
 * - Request duration histogram
 * - Response size histogram
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Store original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  // Track if metrics have been recorded (prevent double recording)
  let metricsRecorded = false;
  
  // Helper to record metrics once
  const recordMetrics = (responseSize: number = 0) => {
    if (metricsRecorded) return;
    metricsRecorded = true;
    
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const method = req.method;
    const route = getRoutePattern(req);
    const statusCode = res.statusCode;
    
    metricsService.recordHttpRequest(method, route, statusCode, duration, responseSize);
  };
  
  // Override res.send to capture response size
  res.send = function (body?: any): Response {
    const size = body ? Buffer.byteLength(body) : 0;
    recordMetrics(size);
    return originalSend.call(this, body);
  };
  
  // Override res.json to capture response size
  res.json = function (body?: any): Response {
    const size = body ? Buffer.byteLength(JSON.stringify(body)) : 0;
    recordMetrics(size);
    return originalJson.call(this, body);
  };
  
  // Override res.end as fallback
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const size = chunk ? Buffer.byteLength(chunk) : 0;
    recordMetrics(size);
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  next();
}

/**
 * Get route pattern from request
 * Falls back to path if route is not available
 */
function getRoutePattern(req: Request): string {
  // Try to get route from Express
  if (req.route && req.route.path) {
    return req.route.path;
  }
  
  // Try to get base path from req.baseUrl
  if (req.baseUrl) {
    return req.baseUrl;
  }
  
  // Fallback to actual path (less ideal for metrics grouping)
  return req.path || req.url || 'unknown';
}

/**
 * Middleware to expose /metrics endpoint
 * 
 * Returns Prometheus metrics in text format
 */
export async function metricsEndpointHandler(req: Request, res: Response) {
  try {
    res.set('Content-Type', metricsService.getContentType());
    const metrics = await metricsService.getMetrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
}
