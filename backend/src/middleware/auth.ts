import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthenticatedUser, RoleCode } from '../types';

const SESSION_COOKIE = 'admosa.sid';

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) {
    throw new UnauthorizedError();
  }

  const result = await pool.query(
    `
    SELECT
      s.id              AS session_id,
      s.expires_at,
      u.id              AS user_id,
      u.email,
      u.full_name,
      u.is_active,
      r.code            AS role_code,
      u.area_id,
      a.code            AS area_code,
      a.name            AS area_name,
      COALESCE(
        (SELECT array_agg(am.area_id) FROM area_management am WHERE am.manager_id = u.id),
        ARRAY[]::uuid[]
      ) AS managed_area_ids,
      COALESCE(
        (
          SELECT array_agg(ar.name ORDER BY ar.name)
          FROM area_management am
          INNER JOIN areas ar ON ar.id = am.area_id
          WHERE am.manager_id = u.id
        ),
        ARRAY[]::text[]
      ) AS managed_area_names
    FROM sessions s
    INNER JOIN users u ON u.id = s.user_id
    INNER JOIN roles r ON r.id = u.role_id
    LEFT JOIN areas a ON a.id = u.area_id
    WHERE s.id = $1
    `,
    [sessionId]
  );

  if (result.rowCount === 0) {
    throw new UnauthorizedError('Sesión inválida');
  }

  const row = result.rows[0];

  if (new Date(row.expires_at) < new Date()) {
    await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    throw new UnauthorizedError('Sesión expirada');
  }

  if (!row.is_active) {
    throw new UnauthorizedError('Cuenta deshabilitada');
  }

  const user: AuthenticatedUser = {
    id: row.user_id,
    email: row.email,
    fullName: row.full_name,
    roleCode: row.role_code as RoleCode,
    areaId: row.area_id,
    areaCode: row.area_code,
    areaName: row.area_name,
    managedAreaIds: row.managed_area_ids || [],
    managedAreaNames: row.managed_area_names || [],
  };

  req.user = user;
  req.sessionId = row.session_id;
  next();
});

export function requireRole(...allowed: RoleCode[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!allowed.includes(req.user.roleCode)) {
      next(new ForbiddenError('Rol insuficiente para esta acción'));
      return;
    }
    next();
  };
}

export { SESSION_COOKIE };
