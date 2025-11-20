import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

/**
 * Logger configuration based on environment
 */
const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || 'info';
const logPretty = process.env.LOG_PRETTY === 'true';
const logToFile = process.env.LOG_TO_FILE === 'true';
const logDir = process.env.LOG_DIR || './logs';
const logFileName = process.env.LOG_FILE_NAME || 'mdl.log';

// Ensure log directory exists
if (logToFile && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Create Pino transport configuration
 */
const getTransports = () => {
  const targets: any[] = [];

  // Console output with pretty print in development
  if (isDevelopment && logPretty) {
    targets.push({
      target: 'pino-pretty',
      level: logLevel,
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    });
  } else {
    // JSON output for production
    targets.push({
      target: 'pino/file',
      level: logLevel,
      options: { destination: 1 }, // stdout
    });
  }

  // File output with rotation
  if (logToFile) {
    targets.push({
      target: 'pino/file',
      level: logLevel,
      options: {
        destination: path.join(logDir, logFileName),
        mkdir: true,
      },
    });
  }

  return targets.length === 1
    ? targets[0]
    : {
        target: 'pino/file',
        options: {
          destination: path.join(logDir, logFileName),
        },
      };
};

/**
 * Create logger instance
 */
export const logger = pino({
  level: logLevel,
  transport: isDevelopment ? getTransports() : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      remoteAddress: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.secret',
      '*.apiKey',
      '*.api_key',
    ],
    remove: true,
  },
});

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * Create child logger with request context
 */
export function createRequestLogger(requestId: string, additionalContext?: any) {
  return logger.child({
    requestId,
    ...additionalContext,
  });
}

/**
 * Mask sensitive information in logs
 */
export function maskSensitive(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return value.substring(0, 2) + '****' + value.substring(value.length - 2);
}

/**
 * Log database query (with timing)
 */
export function logQuery(
  query: string,
  params: any[],
  duration: number,
  requestId?: string
) {
  const log = requestId ? logger.child({ requestId }) : logger;
  log.debug(
    {
      query: query.substring(0, 200), // Truncate long queries
      params: params.length,
      duration: `${duration}ms`,
    },
    'Database query executed'
  );
}

/**
 * Log authentication event
 */
export function logAuth(
  event: 'login' | 'logout' | 'token_refresh' | 'failed_login',
  userId: string,
  metadata?: any
) {
  logger.info(
    {
      event: `auth.${event}`,
      userId,
      ...metadata,
    },
    `Authentication event: ${event}`
  );
}

/**
 * Log error with full context
 */
export function logError(error: Error, context?: any, requestId?: string) {
  const log = requestId ? logger.child({ requestId }) : logger;
  log.error(
    {
      err: error,
      ...context,
    },
    error.message
  );
}

/**
 * Log startup information
 */
export function logStartup(config: {
  port: number;
  host: string;
  storageMode: string;
  dbConnected: boolean;
}) {
  logger.info(
    {
      config: {
        port: config.port,
        host: config.host,
        storageMode: config.storageMode,
        dbConnected: config.dbConnected,
        nodeEnv: process.env.NODE_ENV,
        logLevel,
      },
    },
    'MDL Application started'
  );
}

/**
 * Log shutdown
 */
export function logShutdown(reason: string) {
  logger.info({ reason }, 'MDL Application shutting down');
}

export default logger;
