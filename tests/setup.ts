// Disable cache BEFORE loading anything else to ensure CacheService singleton sees this
process.env.ENABLE_CACHE = 'false';
process.env.NODE_ENV = 'test';

// Load environment variables for tests
import { config } from 'dotenv';
config();

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-' + Math.random().toString(36).substring(7),
}));
