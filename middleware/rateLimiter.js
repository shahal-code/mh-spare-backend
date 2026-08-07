import rateLimit from 'express-rate-limit';

const authLockoutMinutes = parseInt(process.env.AUTH_LOCKOUT_MINUTES || '10', 10);
const authMaxAttempts = parseInt(process.env.AUTH_LOCKOUT_MAX_ATTEMPTS || '10', 10);

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // allow storefront browsing and live updates
  message: { success: false, message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: authLockoutMinutes * 60 * 1000,
  max: authMaxAttempts,
  message: { success: false, message: `Too many login attempts, please try again after ${authLockoutMinutes} minutes` },
  standardHeaders: true,
  legacyHeaders: false,
});
