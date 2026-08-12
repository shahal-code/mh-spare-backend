import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import redis from '../config/redis.js';

const authLockoutMinutes = parseInt(process.env.AUTH_LOCKOUT_MINUTES || '10', 10);
const authMaxAttempts = parseInt(process.env.AUTH_LOCKOUT_MAX_ATTEMPTS || '10', 10);

const getStore = (prefix) => {
  if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
    try {
      return new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix,
      });
    } catch (err) {
      console.warn(`MemoryStore fallback for ${prefix}:`, err.message);
    }
  }
  return undefined; // Standard MemoryStore fallback when Redis is offline
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // allow storefront browsing and live updates
  message: { success: false, message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:api:'),
});

export const authLimiter = rateLimit({
  windowMs: authLockoutMinutes * 60 * 1000,
  max: authMaxAttempts,
  message: { success: false, message: `Too many login attempts, please try again after ${authLockoutMinutes} minutes` },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:auth:'),
});
