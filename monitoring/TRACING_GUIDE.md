# Distributed Tracing Guide

## Overview

MDL API uses OpenTelemetry for distributed tracing, with traces exported to Jaeger for visualization and analysis. Tracing provides end-to-end visibility into request flows, helping identify performance bottlenecks, debug issues, and understand system behavior.

**Components:**
- **OpenTelemetry SDK**: Industry-standard observability framework
- **Auto-instrumentation**: Automatic tracing for HTTP, Express, PostgreSQL, Redis
- **Custom spans**: Manual instrumentation for business-critical operations
- **Jaeger**: Open-source tracing backend and UI

**Benefits:**
- **Request Tracing**: Follow requests across all components
- **Performance Analysis**: Identify slow operations and bottlenecks
- **Error Tracking**: Pinpoint where errors occur in the call chain
- **Dependency Mapping**: Visualize service dependencies
- **Root Cause Analysis**: Quickly diagnose production issues

---

## Architecture

```
┌─────────────┐
│  MDL API    │ ──── Auto-instrumentation (HTTP, Express, PostgreSQL)
│  (Express)  │ ──── Custom spans (Storage, Cache, Validation)
└──────┬──────┘
       │
       │ OTLP HTTP
       ↓
┌─────────────┐
│   Jaeger    │ ──── Trace storage
│  All-in-One │ ──── Query service
│             │ ──── UI (port 16686)
└─────────────┘
```

**Trace Flow:**
1. Request arrives at Express
2. Auto-instrumentation creates root span
3. Custom spans track business operations
4. Spans exported to Jaeger via OTLP HTTP
5. Jaeger stores and indexes traces
6. UI allows querying and visualization

---

## Quick Start

### 1. Start Jaeger

```bash
# Using docker-compose (recommended)
docker compose -f docker-compose.monitoring.yml up jaeger -d

# Or standalone
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:1.54
```

### 2. Configure Environment

```bash
# .env
TRACING_ENABLED=true
JAEGER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
SERVICE_NAME=mdl-api
SERVICE_VERSION=1.0.0
```

### 3. Start MDL API

```bash
npm run dev
```

### 4. Access Jaeger UI

Open http://localhost:16686

### 5. Generate Traces

```bash
# Make API requests
curl http://localhost:3000/api/v1/metrics

# View traces in Jaeger UI
# Select service: mdl-api
# Click "Find Traces"
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TRACING_ENABLED` | Enable/disable tracing | `true` |
| `JAEGER_OTLP_ENDPOINT` | Jaeger OTLP HTTP endpoint | `http://localhost:4318/v1/traces` |
| `SERVICE_NAME` | Service name in traces | `mdl-api` |
| `SERVICE_VERSION` | Service version | `1.0.0` |

### Tracing Configuration

**Location:** `src/tracing/tracer.ts`

```typescript
const sdk = new NodeSDK({
  resource: resources.resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    environment: process.env.NODE_ENV || 'development',
    'service.namespace': 'mdl',
  }),
  spanProcessor: new BatchSpanProcessor(traceExporter, {
    maxQueueSize: 1000,        // Max spans to queue
    maxExportBatchSize: 512,   // Max spans per batch
    scheduledDelayMillis: 5000, // Export interval
    exportTimeoutMillis: 30000, // Export timeout
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Instrumentation config
    }),
  ],
});
```

**Auto-Instrumentation Enabled:**
- ✅ HTTP (`@opentelemetry/instrumentation-http`)
- ✅ Express (`@opentelemetry/instrumentation-express`)
- ✅ PostgreSQL (`@opentelemetry/instrumentation-pg`)
- ❌ File System (disabled - too noisy)
- ❌ Redis (disabled - enable if using)

**Ignored Endpoints:**
- `/health` - Health check endpoint
- `/metrics` - Prometheus metrics endpoint
- Requests to Jaeger itself

---

## Instrumented Components

### 1. HTTP Requests (Auto)

**What's Traced:**
- All incoming HTTP requests
- All outgoing HTTP requests
- Request method, path, status code
- Request/response headers
- Request duration

**Span Attributes:**
- `http.method`: HTTP method (GET, POST, etc.)
- `http.route`: Route pattern (/api/v1/metrics/:id)
- `http.status_code`: Response status (200, 404, 500)
- `http.target`: Request URL path
- `http.user_agent`: Client user agent

**Example Trace:**
```
GET /api/v1/metrics/METRIC-001
├─ middleware.metricsMiddleware (15ms)
├─ handler.getMetricById (120ms)
│  ├─ PostgresMetricStore.findById (95ms)
│  │  └─ pg.query (90ms)
│  └─ Cache.get (8ms)
└─ response (5ms)
```

### 2. Express Middleware (Auto)

**What's Traced:**
- Express route handlers
- Middleware execution
- Route matching

**Span Attributes:**
- `express.type`: handler, middleware
- `express.name`: Function name
- `http.route`: Matched route pattern

### 3. PostgreSQL Queries (Auto)

**What's Traced:**
- All database queries
- Connection pool operations
- Query parameters (sanitized)
- Query duration

**Span Attributes:**
- `db.system`: postgresql
- `db.name`: Database name
- `db.statement`: SQL query (truncated)
- `db.operation`: SELECT, INSERT, UPDATE, DELETE
- `db.sql.table`: Table name
- `net.peer.name`: Database host
- `net.peer.port`: Database port

**Example Trace:**
```
PostgresMetricStore.findById
└─ pg.query (90ms)
   └─ SELECT * FROM metrics WHERE metric_id = $1
```

### 4. Storage Operations (Custom)

**Location:** `src/storage/PostgresMetricStore.ts`

**Traced Methods:**
- `create()` - Create new metric
- `findById()` - Find metric by ID

**Span Attributes:**
- `component`: storage
- `db.system`: postgresql
- `metric.id`: Metric ID
- `metric.category`: Metric category
- `metric.found`: Whether metric was found (findById)
- `metric.name`: Metric name (create)

**Implementation:**
```typescript
import { createStorageSpan, executeWithSpan } from '../tracing/spans';

async create(input: MetricDefinitionInput): Promise<MetricDefinition> {
  const span = createStorageSpan('create', {
    'metric.category': input.category || 'unknown',
  });

  return executeWithSpan(span, async () => {
    // ... operation logic ...
    
    span.addEvent('metric.created', {
      'metric.id': created.metric_id,
      'metric.name': created.name,
    });
    
    return created;
  });
}
```

### 5. Cache Operations (Custom)

**Location:** `src/cache/CacheService.ts`

**Traced Methods:**
- `get()` - Get from cache
- `set()` - Set in cache

**Span Attributes:**
- `component`: cache
- `cache.system`: memory or redis
- `cache.key`: Cache key
- `cache.hit`: Whether cache hit (true/false)
- `cache.ttl`: Time-to-live in seconds
- `cache.size`: Size of cached value in bytes

**Example Trace:**
```
Cache.get (8ms)
└─ cache.hit: true
   cache.key: metrics:list:page:1
   cache.system: memory
```

---

## Using Jaeger UI

### Access

http://localhost:16686

### Finding Traces

1. **Select Service**: `mdl-api`
2. **Select Operation**: Choose specific operation or "all"
3. **Set Time Range**: Last hour, last 3 hours, custom
4. **Add Tags** (optional):
   - `http.status_code=500` - Find errors
   - `http.method=POST` - Find POST requests
   - `db.system=postgresql` - Find DB operations
5. **Click "Find Traces"**

### Reading Traces

**Trace List View:**
- Service name
- Operation name
- Duration
- Number of spans
- Timestamp

**Trace Detail View:**
- Span timeline (waterfall)
- Span hierarchy (parent-child)
- Span attributes
- Span events
- Logs and exceptions

**Key Metrics:**
- **Total Duration**: End-to-end request time
- **Span Duration**: Individual operation time
- **Span Count**: Number of operations
- **Error Count**: Failed operations

### Common Searches

**Find Slow Requests:**
```
Service: mdl-api
Operation: GET /api/v1/metrics
Min Duration: 1s
```

**Find Errors:**
```
Service: mdl-api
Tags: error=true
```
OR
```
Tags: http.status_code=500
```

**Find Database Slow Queries:**
```
Service: mdl-api
Operation: SELECT
Tags: db.system=postgresql
Min Duration: 500ms
```

**Find Cache Misses:**
```
Service: mdl-api
Operation: Cache.get
Tags: cache.hit=false
```

---

## Adding Custom Spans

### 1. Import Span Utilities

```typescript
import { createStorageSpan, executeWithSpan } from '../tracing/spans';
```

### 2. Create Span

```typescript
async myOperation(id: string): Promise<Result> {
  const span = createStorageSpan('myOperation', {
    'operation.id': id,
    'operation.type': 'business',
  });

  return executeWithSpan(span, async () => {
    // Your operation logic here
    const result = await doSomething(id);
    
    // Add events
    span.addEvent('processing.started', {
      'item.count': result.length,
    });
    
    // Add more attributes
    span.setAttribute('operation.success', true);
    
    return result;
  });
}
```

### 3. Available Span Creators

**Storage Operations:**
```typescript
createStorageSpan(operation: string, attributes?: Record<string, any>)
```

**Cache Operations:**
```typescript
createCacheSpan(operation: string, attributes?: Record<string, any>)
```

**Validation Operations:**
```typescript
createValidationSpan(operation: string, attributes?: Record<string, any>)
```

**OPA Policy Operations:**
```typescript
createOPASpan(policy: string, attributes?: Record<string, any>)
```

### 4. Manual Span Creation

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('mdl-custom', '1.0.0');

async function complexOperation() {
  const span = tracer.startSpan('complexOperation');
  
  try {
    // Operation logic
    const result = await doWork();
    
    span.setAttribute('result.count', result.length);
    span.setStatus({ code: SpanStatusCode.OK });
    
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    throw error;
  } finally {
    span.end();
  }
}
```

---

## Best Practices

### 1. Span Naming

✅ **Good:**
- `Storage.findById`
- `Cache.get`
- `Validation.validateMetric`
- `HTTP GET /api/v1/metrics/:id`

❌ **Bad:**
- `operation` (too generic)
- `doStuff` (not descriptive)
- `GET /api/v1/metrics/METRIC-123` (high cardinality)

### 2. Span Attributes

✅ **Good:**
- `metric.id`: METRIC-001
- `cache.hit`: true
- `db.statement`: SELECT * FROM metrics
- `http.status_code`: 200

❌ **Bad:**
- `user.email`: user@example.com (PII)
- `password`: secret123 (sensitive)
- `body`: {large json payload} (too large)

### 3. Span Granularity

**Too Coarse:**
```typescript
// Only traces entire request
async handleRequest() {
  return await processEverything();
}
```

**Too Fine:**
```typescript
// Traces every variable assignment
const span1 = tracer.startSpan('assign-x');
const x = 1;
span1.end();

const span2 = tracer.startSpan('assign-y');
const y = 2;
span2.end();
```

**Just Right:**
```typescript
// Traces logical operations
async handleRequest() {
  const data = await fetchData();      // Auto-traced
  const validated = await validate();   // Custom span
  const result = await process();       // Custom span
  return result;
}
```

### 4. Error Handling

✅ **Always record exceptions:**
```typescript
try {
  // operation
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
  throw error;
}
```

✅ **Use executeWithSpan helper:**
```typescript
return executeWithSpan(span, async () => {
  // Automatically handles exceptions
  return await doWork();
});
```

### 5. Performance

- **Sampling**: Consider sampling in high-traffic production
- **Batch Export**: Use BatchSpanProcessor (default)
- **Ignore Noisy Operations**: Health checks, metrics endpoints
- **Limit Attribute Size**: Truncate large values

---

## Troubleshooting

### Traces Not Appearing

**Check Jaeger Connection:**
```bash
# Test Jaeger OTLP endpoint
curl -v http://localhost:4318/v1/traces

# Check Jaeger UI
curl http://localhost:16686
```

**Check Tracing Enabled:**
```bash
# .env
TRACING_ENABLED=true
```

**Check Application Logs:**
```
🔍 Initializing tracing: mdl-api@1.0.0
🔍 Jaeger endpoint: http://localhost:4318/v1/traces
✅ Tracing initialized successfully
```

**Verify Spans Are Being Created:**
```typescript
import { trace } from '@opentelemetry/api';

// In your code
const activeSpan = trace.getActiveSpan();
console.log('Active span:', activeSpan);
```

### No Database Traces

**Enable PostgreSQL Instrumentation:**
```typescript
// src/tracing/tracer.ts
'@opentelemetry/instrumentation-pg': {
  enabled: true,
  enhancedDatabaseReporting: true,
},
```

**Check pg Version:**
```bash
npm list pg
```
OpenTelemetry supports pg v7.x and v8.x.

### Slow Trace Export

**Adjust Batch Settings:**
```typescript
spanProcessor: new BatchSpanProcessor(traceExporter, {
  maxQueueSize: 2000,           // Increase queue
  maxExportBatchSize: 1024,     // Larger batches
  scheduledDelayMillis: 2000,   // Export more frequently
}),
```

### High Memory Usage

**Reduce Queue Size:**
```typescript
maxQueueSize: 500,
maxExportBatchSize: 256,
```

**Enable Sampling:**
```typescript
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

const sdk = new NodeSDK({
  sampler: new TraceIdRatioBasedSampler(0.1), // Sample 10%
  // ...
});
```

### Missing Custom Spans

**Check Span Creation:**
```typescript
const span = createStorageSpan('test');
console.log('Span created:', span);
span.end();
```

**Verify Import:**
```typescript
import { createStorageSpan, executeWithSpan } from '../tracing/spans';
```

**Check Async Context:**
```typescript
// Ensure spans are created in the request context
// Use executeWithSpan to maintain context
```

---

## Performance Impact

### Overhead

**Production Benchmarks** (approximate):
- Auto-instrumentation: 1-2% CPU overhead
- Custom spans: <0.1ms per span
- Batch export: Minimal (async)
- Memory: 5-10MB for span buffer

### Recommendations

**Development:**
- Enable all tracing
- No sampling
- Keep all spans

**Staging:**
- Enable all tracing
- 50% sampling
- Extended retention (7 days)

**Production:**
- Enable selective tracing
- 10-25% sampling
- Shorter retention (3 days)
- Monitor trace volume

### Sampling Configuration

```typescript
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-base';

// Sample 25% of traces
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.25),
});

const sdk = new NodeSDK({
  sampler,
  // ...
});
```

---

## Integration with Other Tools

### Grafana

**Add Jaeger Datasource:**
1. Configuration → Data Sources
2. Add data source → Jaeger
3. URL: http://jaeger:16686
4. Save & Test

**Trace-to-Metrics:**
Link traces to Prometheus metrics using exemplars.

### Prometheus

**Span Metrics:**
OpenTelemetry can export span metrics to Prometheus:
- `traces.spans.duration`
- `traces.spans.count`
- `traces.spans.errors`

### Logs

**Correlate Logs with Traces:**
```typescript
import { trace, context } from '@opentelemetry/api';

// In logger
const span = trace.getSpan(context.active());
const traceId = span?.spanContext().traceId;
const spanId = span?.spanContext().spanId;

logger.info({
  traceId,
  spanId,
  message: 'Processing request',
});
```

**Search Logs by Trace ID:**
```bash
# In Loki/Grafana
{app="mdl-api"} |= "traceId=abc123"
```

---

## Advanced Topics

### Context Propagation

**W3C Trace Context** (default):
```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
tracestate: congo=t61rcWkgMzE
```

**Propagate to External Services:**
```typescript
import { propagation, trace, context as otelContext } from '@opentelemetry/api';

const headers = {};
propagation.inject(otelContext.active(), headers);

// Make HTTP request with headers
await axios.get('https://api.example.com', { headers });
```

### Custom Exporters

**Multiple Exporters:**
```typescript
import { MultiSpanProcessor } from '@opentelemetry/sdk-trace-base';

const sdk = new NodeSDK({
  spanProcessor: new MultiSpanProcessor([
    new BatchSpanProcessor(jaegerExporter),
    new BatchSpanProcessor(otlpExporter),
  ]),
});
```

### Span Links

**Link Related Traces:**
```typescript
const span = tracer.startSpan('operation', {
  links: [
    { context: relatedSpanContext },
  ],
});
```

---

## Useful Queries

### PromQL (Span Metrics)

**Request Rate:**
```promql
rate(traces_spans_total{service="mdl-api"}[5m])
```

**Error Rate:**
```promql
rate(traces_spans_total{service="mdl-api", status="error"}[5m])
```

**Latency P95:**
```promql
histogram_quantile(0.95, 
  rate(traces_spans_duration_bucket{service="mdl-api"}[5m])
)
```

### Jaeger UI Queries

**Find Traces by Tag:**
```
service=mdl-api
http.status_code=500
```

**Find Slow Traces:**
```
service=mdl-api
duration>1s
```

**Find Traces with Errors:**
```
service=mdl-api
error=true
```

---

## Next Steps

**Task 4: Create Grafana Dashboards**
- Import MDL API dashboard
- Create trace analytics dashboard
- Configure trace-to-metrics links

**Task 5: Log Aggregation** (Optional)
- Add Loki for log aggregation
- Correlate logs with traces
- Create unified observability view

**Task 6: Operational Runbooks**
- Document trace-based debugging procedures
- Create runbooks for common trace patterns
- Train team on trace analysis

---

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)

---

**Created:** November 23, 2025  
**Version:** 1.0.0  
**Status:** Complete
