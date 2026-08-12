import redis from "../config/redis.js";

/**
 * Get a cached value by key.
 * Returns parsed JS object or null if not found / Redis unavailable.
 */
export const getCache = async (key) => {
    try {
        const data = await redis.get(key);
        if (!data) return null;
        return JSON.parse(data);
    } catch (err) {
        console.error(`Cache GET error [${key}]:`, err.message);
        return null;
    }
};

/**
 * Set a cache value with TTL (seconds).
 * Silently fails if Redis is unavailable.
 */
export const setCache = async (key, value, ttlSeconds) => {
    try {
        const serialized = JSON.stringify(value);
        await redis.set(key, serialized, "EX", ttlSeconds);
    } catch (err) {
        console.error(`Cache SET error [${key}]:`, err.message);
    }
};

/**
 * Delete a specific cache key.
 */
export const deleteCache = async (key) => {
    try {
        await redis.del(key);
    } catch (err) {
        console.error(`Cache DEL error [${key}]:`, err.message);
    }
};

/**
 * Delete all cache keys matching a pattern (e.g. "shop:*").
 * Uses SCAN to avoid blocking Redis with KEYS command.
 */
export const deleteCachePattern = async (pattern) => {
    try {
        let cursor = "0";
        do {
            const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
            cursor = nextCursor;
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== "0");
    } catch (err) {
        console.error(`Cache DEL pattern error [${pattern}]:`, err.message);
    }
};
