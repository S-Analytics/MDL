import dotenv from 'dotenv';
import express from 'express';
import * as path from 'path';
import { createServer } from './api';
import { FileUserStore } from './auth/FileUserStore';
import { getDashboardHTML } from './dashboard';
import { errorHandlingMiddleware, notFoundMiddleware } from './middleware/logging';
import { InMemoryMetricStore } from './storage';
import { setupGracefulShutdown } from './utils/database';
import { logger, logShutdown, logStartup } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize storage with default persistence path
const DEFAULT_STORAGE_PATH = process.env.PERSISTENCE_PATH || path.join(process.cwd(), '.mdl', 'metrics.json');
const store = new InMemoryMetricStore(DEFAULT_STORAGE_PATH);

logger.info({ storagePath: DEFAULT_STORAGE_PATH }, 'Initializing metric store');

// Initialize authentication if enabled
let userStore: FileUserStore | undefined;
const authEnabled = process.env.AUTH_ENABLED === 'true';

async function initializeAuth() {
  if (authEnabled) {
    const authFilePath = process.env.AUTH_FILE_PATH || path.join(process.cwd(), 'data', 'users.json');
    userStore = new FileUserStore(authFilePath);
    await userStore.initialize();
    
    logger.info({ path: authFilePath }, 'Authentication initialized (File storage)');
    
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
  // Initialize auth before creating server
  await initializeAuth();
  
  // Create API server (after auth is initialized)
  const app = createServer(store, {
    enableAuth: authEnabled,
    userStore,
  });

  // Serve static files from examples directory
  app.use('/examples', express.static(path.join(process.cwd(), 'examples')));

  // Add dashboard route
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
        storageMode: process.env.STORAGE_MODE || 'local',
        dbConnected: false,
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
      
      // Show storage configuration
      const pgHost = process.env.DB_HOST || process.env.POSTGRES_HOST;
      const pgPort = process.env.DB_PORT || process.env.POSTGRES_PORT;
      const pgDb = process.env.DB_NAME || process.env.POSTGRES_DB;
      
      if (pgHost && pgPort && pgDb) {
        logger.info(`💾 Storage: PostgreSQL (${pgHost}:${pgPort}/${pgDb})`);
        logger.info(`   Note: Configure PostgreSQL in dashboard settings to use database`);
      } else {
        logger.info(`💾 Default Storage: ${DEFAULT_STORAGE_PATH}`);
        logger.info(`   Note: Configure PostgreSQL in dashboard settings for database storage`);
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

// Export for programmatic use
export * from './api';
export * from './config';
export * from './models';
export * from './opa';
export * from './storage';
export { store };

