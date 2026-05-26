import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me } from './auth.controller';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Rate limit estricto en login — defensa contra fuerza bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: { code: 'RATE_LIMITED', message: 'Demasiados intentos. Espera 15 minutos.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login',  loginLimiter, asyncHandler(login));
router.post('/logout', requireAuth, asyncHandler(logout));
router.get('/me',      requireAuth, asyncHandler(me));

export default router;
