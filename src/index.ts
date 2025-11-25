// Load environment variables FIRST (before any other imports)
import dotenv from 'dotenv';
dotenv.config();

// Initialize tracing BEFORE any other imports to enable auto-instrumentation
import { initializeTracing } from './tracing';
const tracingSdk = initializeTracing();

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { createServer } from './api';
import { FileUserStore } from './auth/FileUserStore';
import { PostgresUserStore } from './auth/PostgresUserStore';
import type { CacheWarmer } from './cache/warmer';
import { createCacheWarmer } from './cache/warmer';
import { getDashboardHTML } from './dashboard';
import { getChangePasswordPageHTML, getLoginPageHTML, getRegisterPageHTML } from './dashboard/authViews';
import { getUserManagementPageHTML } from './dashboard/userManagementViews';
import { BusinessMetricsCollector } from './metrics/BusinessMetricsCollector';
import { errorHandlingMiddleware, notFoundMiddleware } from './middleware/logging';
import { InMemoryMetricStore, PostgresMetricStore } from './storage';
import { IMetricStore } from './storage/MetricStore';
import { closeDatabasePool, DatabasePool, initializeDatabasePool, setupGracefulShutdown } from './utils/database';
import { logger, logShutdown, logStartup } from './utils/logger';

// Storage settings file path
const SETTINGS_FILE = path.join(process.cwd(), '.mdl', 'settings.json');

// Read storage mode from settings file (simulating localStorage on server)
function getStorageSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.warn('Failed to read storage settings, using defaults');
  }
  return { storage: 'local' };
}

// Storage mode configuration
let currentSettings = getStorageSettings();
let STORAGE_MODE = currentSettings.storage || 'local';
const DEFAULT_STORAGE_PATH = process.env.PERSISTENCE_PATH || path.join(process.cwd(), '.mdl', 'metrics.json');

// Initialize with temporary local store (will be replaced if postgres mode)
let store: IMetricStore = new InMemoryMetricStore(DEFAULT_STORAGE_PATH);
let dbPool: DatabasePool | null = null;
let cacheWarmer: CacheWarmer | null = null;
let businessMetricsCollector: BusinessMetricsCollector | null = null;

// Log storage mode
if (STORAGE_MODE === 'postgres' || STORAGE_MODE === 'postgresql') {
  logger.info('Storage mode: PostgreSQL (from settings.json)');
} else {
  logger.info({ storagePath: DEFAULT_STORAGE_PATH }, 'Storage mode: local (from settings.json)');
}

// Initialize authentication if enabled
let userStore: FileUserStore | PostgresUserStore | undefined;
const authEnabled = process.env.AUTH_ENABLED === 'true';
const authStorageMode = process.env.AUTH_STORAGE_MODE || 'file'; // 'file' or 'database'

async function initializeAuth() {
  if (authEnabled) {
    if (authStorageMode === 'database' && dbPool) {
      // Use PostgreSQL for auth storage with the same dbPool
      userStore = new PostgresUserStore(dbPool);
      await userStore.initialize();
      
      logger.info({ mode: 'database' }, 'Authentication initialized (PostgreSQL storage)');
    } else {
      // Use file-based auth storage
      const authFilePath = process.env.AUTH_FILE_PATH || path.join(process.cwd(), 'data', 'users.json');
      userStore = new FileUserStore(authFilePath);
      await userStore.initialize();
      
      logger.info({ path: authFilePath, mode: 'file' }, 'Authentication initialized (File storage)');
    }
    
    // Create default admin user in development
    if (process.env.NODE_ENV === 'development' || process.env.DEV_CREATE_DEFAULT_USER === 'true') {
      const existingAdmin = await userStore.findByUsername('admin');
      if (!existingAdmin) {
        const { hashPassword } = await import('./auth/jwt');
        const { UserRole } = await import('./models/User');
        
        const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
        const passwordHash = await hashPassword(password);
        
        await userStore.create({
          username: 'admin',
          email: 'admin@mdl.local',
          password_hash: passwordHash,
          full_name: 'System Administrator',
          role: UserRole.ADMIN,
        });
        
        logger.warn('⚠️  Default admin user created:');
        logger.warn(`   Username: admin`);
        logger.warn(`   Password: ${password}`);
        logger.warn('   Change this password immediately!');
      }
    }
  }
}

// Start server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  // Initialize PostgreSQL if configured
  if (STORAGE_MODE === 'postgres' || STORAGE_MODE === 'postgresql') {
    const savedConfig = currentSettings.postgres;
    const dbConfig = savedConfig || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'mdl',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };

    try {
      dbPool = await initializeDatabasePool(dbConfig);
      store = new PostgresMetricStore(dbConfig, dbPool);
      logger.info({ 
        host: dbConfig.host, 
        port: dbConfig.port, 
        database: dbConfig.database 
      }, 'PostgreSQL metric store initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize PostgreSQL, falling back to local storage');
      store = new InMemoryMetricStore(DEFAULT_STORAGE_PATH);
      STORAGE_MODE = 'local';
    }
  }

  // Initialize auth before creating server
  await initializeAuth();
  
  // Create API server (after auth is initialized) - pass getter function for dynamic store access
  const app = createServer(() => store, {
    enableAuth: authEnabled,
    userStore,
  });

  // Initialize cache warmer
  if (process.env.ENABLE_CACHE === 'true') {
    cacheWarmer = createCacheWarmer(store);
    logger.info('Cache warmer initialized');
  }

  // Serve static files from examples directory
  app.use('/examples', express.static(path.join(process.cwd(), 'examples')));

  // Add dashboard routes
  // When AUTH_ENABLED=true, the dashboard HTML contains client-side JavaScript
  // that checks localStorage for an access token and redirects to /auth/login if not found
  app.get('/', (req, res) => {
    res.send(getDashboardHTML());
  });

  app.get('/dashboard', (req, res) => {
    // Prevent browser caching of dashboard HTML/JS
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.send(getDashboardHTML());
  });

  // Authentication pages (if auth is enabled)
  if (authEnabled) {
    app.get('/auth/login', (req, res) => {
      res.send(getLoginPageHTML());
    });

    app.get('/auth/register', (req, res) => {
      res.send(getRegisterPageHTML());
    });

    app.get('/auth/change-password', (req, res) => {
      res.send(getChangePasswordPageHTML());
    });

    app.get('/admin/users', (req, res) => {
      res.send(getUserManagementPageHTML());
    });

    logger.info('Auth pages enabled: /auth/login, /auth/register, /auth/change-password, /admin/users');
  }

  // 404 handler (must be after all routes)
  app.use(notFoundMiddleware);

  // Error handling middleware (must be last)
  app.use(errorHandlingMiddleware);
  
  return new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      // Log banner
      logger.info('');
      logger.info('╔══════════════════════════════════════════════════════════════╗');
      logger.info('║  MDL - Metrics Definition Library                           ║');
      logger.info('╚══════════════════════════════════════════════════════════════╝');
      logger.info('');
      
      // Log startup configuration
      logStartup({
        port: PORT,
        host: HOST,
        storageMode: STORAGE_MODE,
        dbConnected: dbPool !== null,
      });
      
      logger.info(`🚀 Server running at http://${HOST}:${PORT}`);
      logger.info(`📊 Dashboard: http://${HOST}:${PORT}/dashboard`);
      logger.info(`🔌 API: http://${HOST}:${PORT}/api/metrics`);
      
      if (authEnabled) {
        logger.info(`🔐 Auth: http://${HOST}:${PORT}/api/auth`);
        logger.info(`   Endpoints: /register, /login, /logout, /refresh, /me`);
      }
      
      logger.info(`💚 Health: http://${HOST}:${PORT}/health`);
      logger.info('');
      
      // Start cache warming (non-blocking)
      if (cacheWarmer) {
        cacheWarmer.start().then(() => {
          const warmerStatus = cacheWarmer!.getStatus();
          if (warmerStatus.enabled) {
            logger.info('🔥 Cache warming: completed initial run');
            if (warmerStatus.scheduledInterval) {
              logger.info(`   Scheduled interval: ${warmerStatus.scheduledInterval} minutes`);
            }
          }
        }).catch(error => {
          logger.error({ error }, 'Cache warming startup failed');
        });
        logger.info('🔥 Cache warming: starting...');
      }
      
      // Start business metrics collection
      businessMetricsCollector = new BusinessMetricsCollector(() => store, 60000); // Collect every 60 seconds
      businessMetricsCollector.start();
      logger.info('📊 Business metrics collector: started (60s interval)');
      
      logger.info('');
      
      // Show storage configuration
      if (dbPool) {
        const dbConfig = {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || '5432',
          database: process.env.DB_NAME || 'mdl',
        };
        logger.info(`💾 Storage: PostgreSQL (${dbConfig.host}:${dbConfig.port}/${dbConfig.database})`);
        logger.info(`   Status: Connected and active`);
      } else {
        const storagePath = process.env.PERSISTENCE_PATH || path.join(process.cwd(), '.mdl', 'metrics.json');
        logger.info(`💾 Storage: ${STORAGE_MODE} (${storagePath})`);
        logger.info(`   Set STORAGE_MODE=postgres in .env to use PostgreSQL`);
      }
      logger.info('');
      
      resolve();
    });
    
    server.on('error', (error) => {
      logger.error({ error }, 'Server startup error');
      reject(error);
    });
  });
}

startServer().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});

// Setup graceful shutdown handlers
setupGracefulShutdown();

// Enhanced shutdown to include cache warmer and metrics collector
process.on('SIGTERM', () => {
  if (cacheWarmer) {
    cacheWarmer.stop();
    logger.info('Cache warmer stopped');
  }
  if (businessMetricsCollector) {
    businessMetricsCollector.stop();
    logger.info('Business metrics collector stopped');
  }
});

process.on('SIGINT', () => {
  if (cacheWarmer) {
    cacheWarmer.stop();
    logger.info('Cache warmer stopped');
  }
  if (businessMetricsCollector) {
    businessMetricsCollector.stop();
    logger.info('Business metrics collector stopped');
  }
  if (cacheWarmer) {
    cacheWarmer.stop();
    logger.info('Cache warmer stopped');
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  logShutdown('uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  logShutdown('unhandled rejection');
  process.exit(1);
});

// Function to switch storage mode dynamically
export async function switchStorageMode(newMode: string, dbConfig?: any): Promise<{ success: boolean; error?: string }> {
  try {
    const mode = newMode.toLowerCase();
    
    if (mode === 'postgresql' || mode === 'postgres') {
      // Initialize PostgreSQL
      if (!dbConfig) {
        return { success: false, error: 'Database configuration required for PostgreSQL mode' };
      }
      
      // Close existing DB pool if any (this resets the global pool)
      if (dbPool) {
        await closeDatabasePool();
        dbPool = null;
      }
      
      // Create new DB pool and store
      dbPool = await initializeDatabasePool(dbConfig);
      store = new PostgresMetricStore(dbConfig, dbPool);
      STORAGE_MODE = 'postgresql';
      
      // Update current settings
      currentSettings = { storage: 'postgresql', postgres: dbConfig };
      
      // Save settings
      const settingsDir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2));
      
      logger.info({ host: dbConfig.host, database: dbConfig.database }, 'Switched to PostgreSQL storage');
      return { success: true };
    } else {
      // Switch to local storage
      if (dbPool) {
        await closeDatabasePool();
        dbPool = null;
      }
      
      store = new InMemoryMetricStore(DEFAULT_STORAGE_PATH);
      STORAGE_MODE = 'local';
      
      // Update current settings
      currentSettings = { storage: 'local' };
      
      // Save settings
      const settingsDir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2));
      
      logger.info({ storagePath: DEFAULT_STORAGE_PATH }, 'Switched to local file storage');
      return { success: true };
    }
  } catch (error: any) {
    logger.error({ error }, 'Failed to switch storage mode');
    return { success: false, error: error.message };
  }
}

export function getCurrentStorageMode() {
  return {
    mode: STORAGE_MODE,
    dbConnected: dbPool !== null,
    settings: currentSettings
  };
}

export function getStore(): IMetricStore {
  return store;
}

// Export for programmatic use
export * from './api';
export * from './config';
export * from './models';
export * from './opa';
export * from './storage';
export { store };

