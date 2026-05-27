import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../config/db';
import { getAuditScope } from '../../services/permissionService';
import {
  appendAuditListFilters,
  buildAuditScopeQuery,
  mapAuditRow,
} from './audit.repository';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  userId: z.string().uuid().optional(),
  action: z.string().min(1).max(64).optional(),
  areaId: z.string().uuid().optional(),
});

const AUDIT_FROM = `
  FROM audit_log al
  LEFT JOIN users u ON u.id = al.user_id
  LEFT JOIN files f ON f.id = al.file_id
`;

function parseListQuery(req: Request) {
  const parsed = listQuerySchema.parse(req.query);
  return {
    limit: parsed.limit,
    offset: parsed.offset,
    filters: {
      userId: parsed.userId,
      action: parsed.action,
      areaId: parsed.areaId,
    },
  };
}

function resolveAuditScopeOnly(req: Request) {
  const scope = getAuditScope(req.user!);
  return buildAuditScopeQuery(scope);
}

function resolveScopedQuery(req: Request) {
  const base = resolveAuditScopeOnly(req);
  if (!base) {
    return null;
  }
  const { filters } = parseListQuery(req);
  return appendAuditListFilters(base, filters);
}

/**
 * Devuelve el historial de acciones aplicando el scope del rol.
 *
 * Estrategia: hacemos JOIN con files para poder filtrar acciones de archivos
 * por área. Las acciones que no involucran archivos (LOGIN, LOGOUT) solo
 * son visibles para ADMIN.
 */
export async function listAudit(req: Request, res: Response): Promise<void> {
  const { limit, offset } = parseListQuery(req);
  const scoped = resolveScopedQuery(req);

  if (!scoped) {
    res.json({ entries: [], total: 0 });
    return;
  }

  const { whereClause, params } = scoped;

  const countSql = `
    SELECT COUNT(*)::int AS total
    ${AUDIT_FROM}
    WHERE ${whereClause}
  `;
  const { rows: countRows } = await pool.query(countSql, params);

  const dataSql = `
    SELECT
      al.id,
      al.action,
      al.metadata,
      al.occurred_at,
      al.ip_address,
      u.id AS user_id,
      u.email AS user_email,
      u.full_name AS user_name,
      al.file_id,
      f.original_name AS file_name
    ${AUDIT_FROM}
    WHERE ${whereClause}
    ORDER BY al.occurred_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const { rows } = await pool.query(dataSql, params);

  res.json({
    total: countRows[0].total,
    entries: rows.map(mapAuditRow),
  });
}

/** Opciones de filtro disponibles dentro del alcance del rol. */
export async function getAuditFilters(req: Request, res: Response): Promise<void> {
  const scoped = resolveAuditScopeOnly(req);

  if (!scoped) {
    res.json({ users: [], actions: [], areas: [] });
    return;
  }

  const { whereClause, params } = scoped;

  const usersSql = `
    SELECT DISTINCT u.id, u.full_name, u.email
    ${AUDIT_FROM}
    WHERE ${whereClause} AND u.id IS NOT NULL
    ORDER BY u.full_name
  `;

  const actionsSql = `
    SELECT DISTINCT al.action
    ${AUDIT_FROM}
    WHERE ${whereClause}
    ORDER BY al.action
  `;

  const areasSql = `
    SELECT DISTINCT f.area_id AS id, a.name
    ${AUDIT_FROM}
    LEFT JOIN areas a ON a.id = f.area_id
    WHERE ${whereClause} AND f.area_id IS NOT NULL
    ORDER BY a.name
  `;

  const [usersResult, actionsResult, areasResult] = await Promise.all([
    pool.query(usersSql, params),
    pool.query(actionsSql, params),
    pool.query(areasSql, params),
  ]);

  res.json({
    users: usersResult.rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
    })),
    actions: actionsResult.rows.map((r) => r.action as string),
    areas: areasResult.rows.map((r) => ({
      id: r.id,
      name: r.name,
    })),
  });
}
