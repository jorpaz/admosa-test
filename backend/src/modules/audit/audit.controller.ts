import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../config/db';
import { getAuditScope, buildFileScopeClause } from '../../services/permissionService';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Devuelve el historial de acciones aplicando el scope del rol.
 *
 * Estrategia: hacemos JOIN con files para poder filtrar acciones de archivos
 * por área. Las acciones que no involucran archivos (LOGIN, LOGOUT) solo
 * son visibles para ADMIN.
 */
export async function listAudit(req: Request, res: Response): Promise<void> {
  const { limit, offset } = querySchema.parse(req.query);
  const user = req.user!;
  const scope = getAuditScope(user);

  if (scope.kind === 'none') {
    res.json({ entries: [], total: 0 });
    return;
  }

  // Construimos WHERE según el scope
  const params: unknown[] = [];
  let whereClause: string;

  if (scope.kind === 'all') {
    whereClause = 'TRUE';
  } else if (scope.kind === 'own') {
    // Usuario: solo sus propias acciones
    params.push(scope.userId);
    whereClause = `al.user_id = $${params.length}`;
  } else {
    // CHIEF / MANAGER: acciones sobre archivos de su(s) área(s)
    // Esto excluye acciones sin file_id (LOGIN, LOGOUT) — por diseño.
    const clause = buildFileScopeClause(scope, 'f', params.length + 1);
    if (!clause) {
      res.json({ entries: [], total: 0 });
      return;
    }
    params.push(...clause.params);
    whereClause = `al.file_id IS NOT NULL AND (${clause.clause})`;
  }

  // Total
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM audit_log al
    LEFT JOIN files f ON f.id = al.file_id
    WHERE ${whereClause}
  `;
  const { rows: countRows } = await pool.query(countSql, params);

  // Datos
  const dataSql = `
    SELECT
      al.id,
      al.action,
      al.metadata,
      al.occurred_at,
      al.ip_address,
      u.id   AS user_id,
      u.email AS user_email,
      u.full_name AS user_name,
      al.file_id,
      f.original_name AS file_name
    FROM audit_log al
    LEFT JOIN users u ON u.id = al.user_id
    LEFT JOIN files f ON f.id = al.file_id
    WHERE ${whereClause}
    ORDER BY al.occurred_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const { rows } = await pool.query(dataSql, params);

  res.json({
    total: countRows[0].total,
    entries: rows.map((r) => ({
      id: r.id,
      action: r.action,
      metadata: r.metadata,
      occurredAt: r.occurred_at,
      ipAddress: r.ip_address,
      user: r.user_id
        ? { id: r.user_id, email: r.user_email, fullName: r.user_name }
        : null,
      file: r.file_id ? { id: r.file_id, name: r.file_name } : null,
    })),
  });
}
