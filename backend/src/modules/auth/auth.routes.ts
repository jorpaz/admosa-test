import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me } from './auth.controller';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

import { env } from '../../config/env';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  message: { error: { code: 'RATE_LIMITED', message: 'Demasiados intentos. Espera 15 minutos.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login',  loginLimiter, asyncHandler(login));
router.post('/logout', requireAuth, asyncHandler(logout));
router.get('/me',      requireAuth, asyncHandler(me));

export default router;
