import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../../config/db';
import { logAudit } from '../../services/auditService';
import { ConflictError, NotFoundError } from '../../utils/errors';

const BCRYPT_ROUNDS = 12;

const createSchema = z
  .object({
    email: z.string().email().max(255).toLowerCase().trim(),
    fullName: z.string().min(2).max(128),
    password: z.string().min(8).max(128),
    roleCode: z.enum(['USER', 'CHIEF', 'MANAGER', 'ADMIN']),
    areaId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.roleCode === 'USER' || data.roleCode === 'CHIEF') && !data.areaId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Usuario y Jefe de área deben tener un área asignada',
        path: ['areaId'],
      });
    }
  });

const updateSchema = z.object({
  fullName: z.string().min(2).max(128).optional(),
  roleCode: z.enum(['USER', 'CHIEF', 'MANAGER', 'ADMIN']).optional(),
  areaId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query(`
    SELECT u.id, u.email, u.full_name, u.is_active, u.created_at,
           r.code AS role_code, r.name AS role_name,
           a.id AS area_id, a.name AS area_name
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    LEFT JOIN areas a ON a.id = u.area_id
    ORDER BY u.created_at DESC
  `);
  res.json({
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      isActive: u.is_active,
      roleCode: u.role_code,
      roleName: u.role_name,
      areaId: u.area_id,
      areaName: u.area_name,
      createdAt: u.created_at,
    })),
  });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const data = createSchema.parse(req.body);

  // Verificar email único
  const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [data.email]);
  if (existing.rowCount && existing.rowCount > 0) {
    throw new ConflictError('Ya existe un usuario con ese email');
  }

  // Resolver role_id
  const { rows: roleRows } = await pool.query('SELECT id FROM roles WHERE code = $1', [data.roleCode]);
  if (roleRows.length === 0) throw new NotFoundError('Rol no existe');

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role_id, area_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [data.email, passwordHash, data.fullName, roleRows[0].id, data.areaId ?? null]
  );

  await logAudit({
    userId: req.user!.id,
    action: 'USER_CREATE',
    metadata: { newUserId: rows[0].id, email: data.email, role: data.roleCode },
    ipAddress: req.ip || null,
  });

  res.status(201).json({ id: rows[0].id });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const userId = z.string().uuid().parse(req.params.id);
  const data = updateSchema.parse(req.body);

  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.fullName !== undefined) {
    params.push(data.fullName);
    updates.push(`full_name = $${params.length}`);
  }
  if (data.areaId !== undefined) {
    params.push(data.areaId);
    updates.push(`area_id = $${params.length}`);
  }
  if (data.isActive !== undefined) {
    params.push(data.isActive);
    updates.push(`is_active = $${params.length}`);
  }
  if (data.roleCode !== undefined) {
    const { rows: roleRows } = await pool.query('SELECT id FROM roles WHERE code = $1', [data.roleCode]);
    if (roleRows.length === 0) throw new NotFoundError('Rol no existe');
    params.push(roleRows[0].id);
    updates.push(`role_id = $${params.length}`);
  }

  if (updates.length === 0) {
    res.json({ ok: true, changed: false });
    return;
  }

  params.push(userId);
  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id`;
  const { rowCount } = await pool.query(sql, params);

  if (rowCount === 0) throw new NotFoundError('Usuario no encontrado');

  await logAudit({
    userId: req.user!.id,
    action: 'USER_UPDATE',
    metadata: { targetUserId: userId, changes: data },
    ipAddress: req.ip || null,
  });

  res.json({ ok: true });
}

export async function listAreas(_req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query(
    'SELECT id, code, name FROM areas ORDER BY name'
  );
  res.json({ areas: rows });
}

export async function listRoles(_req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query(
    'SELECT id, code, name, description FROM roles ORDER BY name'
  );
  res.json({ roles: rows });
}
