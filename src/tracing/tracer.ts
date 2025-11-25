/**
 * OpenTelemetry Tracing Setup
 * 
 * Configures distributed tracing for the MDL API using OpenTelemetry.
 * Exports traces to Jaeger for visualization and analysis.
 */

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK, resources } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry tracing
 * 
 * Sets up auto-instrumentation for HTTP, Express, PostgreSQL, and other libraries.
 * Exports traces to Jaeger via OTLP HTTP endpoint.
 * 
 * @returns NodeSDK instance
 */
export function initializeTracing(): NodeSDK {
  if (sdk) {
    console.log('⚠️  Tracing already initialized');
    return sdk;
  }

  const tracingEnabled = process.env.TRACING_ENABLED !== 'false';
  
  if (!tracingEnabled) {
    console.log('🔍 Tracing disabled via TRACING_ENABLED=false');
    // Return a no-op SDK
    sdk = new NodeSDK({
      instrumentations: [],
    });
    return sdk;
  }

  const jaegerEndpoint = process.env.JAEGER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
  const serviceName = process.env.SERVICE_NAME || 'mdl-api';
  const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';

  console.log(`🔍 Initializing tracing: ${serviceName}@${serviceVersion}`);
  console.log(`🔍 Jaeger endpoint: ${jaegerEndpoint}`);

  // Configure trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: jaegerEndpoint,
    headers: {},
  });

  // Configure resource attributes
  const resource = resources.resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    environment: process.env.NODE_ENV || 'development',
    'service.namespace': 'mdl',
  });

  // Initialize SDK with auto-instrumentation
  sdk = new NodeSDK({
    resource,
    spanProcessor: new BatchSpanProcessor(traceExporter, {
      maxQueueSize: 1000,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable file system instrumentation (too noisy)
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        // HTTP instrumentation
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingRequestHook: (request) => {
            // Ignore health check and metrics endpoints
            const url = request.url || '';
            return url === '/health' || url === '/metrics';
          },
          ignoreOutgoingRequestHook: (request) => {
            // Ignore requests to Jaeger itself
            const hostname = request.hostname || request.host || '';
            return hostname.includes('jaeger') || hostname.includes('localhost:4318');
          },
        },
        // Express instrumentation
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        // PostgreSQL instrumentation
        '@opentelemetry/instrumentation-pg': {
          enabled: true,
          enhancedDatabaseReporting: true,
        },
        // Redis instrumentation (if using Redis)
        '@opentelemetry/instrumentation-redis': {
          enabled: false, // Enable if using Redis
        },
      }),
    ],
  });

  // Start the SDK
  sdk.start();
  console.log('✅ Tracing initialized successfully');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('🔍 Shutting down tracing...');
    try {
      await sdk?.shutdown();
      console.log('✅ Tracing shut down successfully');
    } catch (error) {
      console.error('❌ Error shutting down tracing:', error);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return sdk;
}

/**
 * Shutdown tracing
 * 
 * Flushes any pending spans and stops the SDK.
 */
export async function shutdownTracing(): Promise<void> {
  if (!sdk) {
    return;
  }

  try {
    await sdk.shutdown();
    sdk = null;
    console.log('✅ Tracing shut down');
  } catch (error) {
    console.error('❌ Error shutting down tracing:', error);
    throw error;
  }
}

/**
 * Get the current SDK instance
 */
export function getTracingSDK(): NodeSDK | null {
  return sdk;
}
