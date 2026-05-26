import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../../config/db';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../utils/errors';
import { logAudit } from '../../services/auditService';
import { SESSION_COOKIE } from '../../middleware/auth';

const loginSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(1).max(128),
});

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: env.SESSION_COOKIE_SAMESITE,
    maxAge: env.SESSION_MAX_AGE_MS,
    path: '/',
  };
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);
  const ipAddress = req.ip || null;

  // 1. Buscar usuario
  const { rows } = await pool.query(
    `SELECT u.id, u.password_hash, u.is_active, r.code AS role_code
     FROM users u INNER JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email]
  );

  // 2. Validar credenciales (timing-attack safe: siempre comparamos un hash)
  // Si el usuario no existe usamos un hash dummy con el mismo costo.
  const DUMMY_HASH = '$2b$12$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01';
  const user = rows[0];
  const hash = user?.password_hash ?? DUMMY_HASH;
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid || !user.is_active) {
    await logAudit({
      userId: user?.id ?? null,
      action: 'LOGIN_FAILURE',
      metadata: { email, reason: !user ? 'no_user' : !valid ? 'bad_password' : 'inactive' },
      ipAddress,
    });
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // 3. Crear sesión
  const expiresAt = new Date(Date.now() + env.SESSION_MAX_AGE_MS);
  const { rows: sessionRows } = await pool.query(
    `INSERT INTO sessions (user_id, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [user.id, expiresAt, ipAddress, req.headers['user-agent'] ?? null]
  );
  const sessionId = sessionRows[0].id;

  // 4. Enviar cookie
  res.cookie(SESSION_COOKIE, sessionId, cookieOptions());

  await logAudit({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    metadata: { role: user.role_code },
    ipAddress,
  });

  res.json({
    user: {
      id: user.id,
      email,
      roleCode: user.role_code,
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (req.sessionId) {
    await pool.query('DELETE FROM sessions WHERE id = $1', [req.sessionId]);
    await logAudit({
      userId: req.user!.id,
      action: 'LOGOUT',
      ipAddress: req.ip || null,
    });
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.json({ ok: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  const u = req.user!;
  res.json({
    user: {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      roleCode: u.roleCode,
      areaId: u.areaId,
      managedAreaIds: u.managedAreaIds,
    },
  });
}
