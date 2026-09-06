/**
 * Redis client configuration.
 * Uses ioredis for connection pooling and automatic reconnection.
 *
 * If REDIS_URL is not set in .env, Redis is completely skipped
 * and all cache helpers become silent no-ops.
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

const REDIS_URL = process.env.REDIS_URL;

let client = null;
let isReady = false;

// ── Only connect if REDIS_URL is explicitly configured ──────
if (REDIS_URL) {
    try {
        client = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 5) {
                    logger.warn('Redis: max retries reached, stopping reconnection');
                    return null;
                }
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true
        });

        client.on('connect', () => {
            isReady = true;
            logger.info('✅ Redis connected');
        });

        client.on('error', (err) => {
            isReady = false;
            logger.warn(`Redis error: ${err.message}`);
        });

        client.on('close', () => {
            isReady = false;
        });

        // Attempt connection (non-blocking)
        client.connect().catch(() => {
            logger.warn('Redis unavailable — caching disabled');
        });
    } catch (err) {
        logger.warn(`Redis init failed: ${err.message}`);
    }
} else {
    logger.info('ℹ️  Redis not configured (REDIS_URL not set) — caching disabled');
}

/**
 * Cache-aside helpers.
 * If Redis is down or not configured, these silently return null / do nothing.
 */
const getCache = async (key) => {
    if (!isReady) return null;
    try {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};

const setCache = async (key, value, ttlSeconds = 60) => {
    if (!isReady) return;
    try {
        await client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch { /* silent */ }
};

const invalidatePattern = async (pattern) => {
    if (!isReady) return;
    try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) await client.del(...keys);
    } catch { /* silent */ }
};

const invalidateKey = async (key) => {
    if (!isReady) return;
    try { await client.del(key); } catch { /* silent */ }
};

module.exports = {
    client,
    getCache,
    setCache,
    invalidatePattern,
    invalidateKey,
    isReady: () => isReady
};
