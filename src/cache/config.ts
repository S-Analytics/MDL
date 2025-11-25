import * as fs from 'fs';
import { RedisOptions } from 'ioredis';
import * as path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), '.mdl', 'settings.json');

// Read settings from file (same as used by storage)
function getRedisSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(data);
      return settings.redis || null;
    }
  } catch (error) {
    // Silently fall back to environment variables
  }
  return null;
}

// Get Redis configuration from settings panel or .env fallback
export function getRedisConfig(): RedisOptions {
  const savedRedisConfig = getRedisSettings();
  
  // Use settings panel config if available, otherwise fall back to .env
  const host = savedRedisConfig?.host || process.env.REDIS_HOST || 'localhost';
  const port = savedRedisConfig?.port || parseInt(process.env.REDIS_PORT || '6379');
  const password = savedRedisConfig?.password || process.env.REDIS_PASSWORD;
  const db = savedRedisConfig?.db !== undefined ? savedRedisConfig.db : parseInt(process.env.REDIS_DB || '0');
  
  return {
    host,
    port,
    ...(password && { password }),
    db,
    keyPrefix: 'mdl:',
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10000
  };
}

// Export default config for backward compatibility
export const redisConfig: RedisOptions = getRedisConfig();

export function getCacheConfig() {
  const savedRedisConfig = getRedisSettings();
  
  // Check if cache is enabled in settings or .env
  const enabledInSettings = savedRedisConfig?.enabled !== undefined ? savedRedisConfig.enabled : null;
  const enabled = enabledInSettings !== null ? enabledInSettings : (process.env.ENABLE_CACHE === 'true');
  
  return {
    enabled,
    defaultTTL: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes
    maxTTL: parseInt(process.env.CACHE_MAX_TTL || '3600'), // 1 hour
  };
}

export const cacheConfig = getCacheConfig();
