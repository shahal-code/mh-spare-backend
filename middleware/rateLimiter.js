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

// Generates an independent key combining User Email + IP Address
// This ensures each user account gets its own independent attempt counter!
const emailOrIpKey = (req) => {
  const email = (req.body && req.body.email) ? String(req.body.email).trim().toLowerCase() : '';
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'ip';
  return email ? `${email}_${ip}` : ip;
};

// Global API rate limiter for general endpoint traffic
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // allow storefront browsing and live updates
  message: { success: false, message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:api:'),
});

// Dedicated User Customer Portal Auth Rate Limiter (Per User Account + IP)
export const userAuthLimiter = rateLimit({
  windowMs: authLockoutMinutes * 60 * 1000,
  max: authMaxAttempts,
  message: { success: false, message: `Too many login attempts, please try again after ${authLockoutMinutes} minutes` },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailOrIpKey,
  store: getStore('rl:user:'),
});

// Dedicated Vendor Portal Auth Rate Limiter (Per Vendor Account + IP)
export const vendorAuthLimiter = rateLimit({
  windowMs: authLockoutMinutes * 60 * 1000,
  max: authMaxAttempts,
  message: { success: false, message: `Too many vendor login attempts, please try again after ${authLockoutMinutes} minutes` },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailOrIpKey,
  store: getStore('rl:vendor:'),
});

// Dedicated Super Admin Portal Auth Rate Limiter (Per Admin Account + IP)
export const superAdminAuthLimiter = rateLimit({
  windowMs: authLockoutMinutes * 60 * 1000,
  max: authMaxAttempts,
  message: { success: false, message: `Too many admin login attempts, please try again after ${authLockoutMinutes} minutes` },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailOrIpKey,
  store: getStore('rl:superadmin:'),
});

// Backward compatible alias
export const authLimiter = userAuthLimiter;
