import * as path from 'path';
import { InMemoryMetricStore } from './storage';
import { createServer } from './api';
import { getDashboardHTML } from './dashboard';

// Initialize storage with default persistence path
const DEFAULT_STORAGE_PATH = path.join(process.cwd(), '.mdl', 'metrics.json');
const store = new InMemoryMetricStore(DEFAULT_STORAGE_PATH);

// Create API server
const app = createServer(store);

// Add dashboard route
app.get('/', (req, res) => {
  res.send(getDashboardHTML());
});

app.get('/dashboard', (req, res) => {
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
  console.log(`💾 Storage: ${DEFAULT_STORAGE_PATH}`);
  console.log('');
});

// Export for programmatic use
export * from './models';
export * from './storage';
export * from './config';
export * from './opa';
export * from './api';
export { store };
