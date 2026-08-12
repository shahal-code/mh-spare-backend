import Redis from "ioredis";

const redisConfig = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy(times) {
        // Retry up to 3 times, then stop (don't block the app)
        if (times > 3) {
            console.warn("Redis: max reconnect attempts reached, running without cache.");
            return null;
        }
        return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
    enableOfflineQueue: false,
};

const redis = new Redis(redisConfig);

redis.on("connect", () => {
    console.log("✅ Redis connected successfully");
});

redis.on("error", (err) => {
    // Log but don't crash the app
    console.error("⚠️  Redis error:", err.message);
});

redis.on("close", () => {
    console.warn("⚠️  Redis connection closed");
});

// Connect on startup
redis.connect().catch((err) => {
    console.warn("⚠️  Redis initial connect failed:", err.message);
});

export default redis;
