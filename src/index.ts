import express from 'express';
import * as path from 'path';
import { createServer } from './api';
import { getDashboardHTML } from './dashboard';
import { InMemoryMetricStore } from './storage';

// Initialize storage with default persistence path
const DEFAULT_STORAGE_PATH = path.join(process.cwd(), '.mdl', 'metrics.json');
const store = new InMemoryMetricStore(DEFAULT_STORAGE_PATH);

// Create API server
const app = createServer(store);

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
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  MDL - Metrics Definition Library                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  console.log(`📊 Dashboard: http://${HOST}:${PORT}/dashboard`);
  console.log(`🔌 API: http://${HOST}:${PORT}/api/metrics`);
  console.log(`💚 Health: http://${HOST}:${PORT}/health`);
  console.log('');
  
  // Show storage configuration
  const pgHost = process.env.DB_HOST || process.env.POSTGRES_HOST;
  const pgPort = process.env.DB_PORT || process.env.POSTGRES_PORT;
  const pgDb = process.env.DB_NAME || process.env.POSTGRES_DB;
  
  if (pgHost && pgPort && pgDb) {
    console.log(`💾 Storage: PostgreSQL (${pgHost}:${pgPort}/${pgDb})`);
    console.log(`   Note: Configure PostgreSQL in dashboard settings to use database`);
  } else {
    console.log(`💾 Default Storage: ${DEFAULT_STORAGE_PATH}`);
    console.log(`   Note: Configure PostgreSQL in dashboard settings for database storage`);
  }
  console.log('');
});

// Export for programmatic use
export * from './api';
export * from './config';
export * from './models';
export * from './opa';
export * from './storage';
export { store };

