import { pool } from '../../config/db';
import {
  FileScope,
  buildFileScopeClause,
} from '../../services/permissionService';

export interface FileRecord {
  id: string;
  originalName: string;
  storageName: string;
  mimeType: string;
  sizeBytes: number;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  areaId: string | null;
  areaName: string | null;
  uploadedAt: Date;
}

export async function listFiles(scope: FileScope): Promise<FileRecord[]> {
  const clause = buildFileScopeClause(scope, 'f', 1);
  if (!clause) return [];

  const sql = `
    SELECT
      f.id, f.original_name, f.storage_name, f.mime_type, f.size_bytes,
      f.owner_id, f.area_id, f.uploaded_at,
      u.full_name AS owner_name,
      u.email AS owner_email,
      a.name AS area_name
    FROM files f
    INNER JOIN users u ON u.id = f.owner_id
    LEFT JOIN areas a ON a.id = f.area_id
    WHERE f.is_deleted = FALSE
      AND (${clause.clause})
    ORDER BY f.uploaded_at DESC
    LIMIT 500
  `;

  const { rows } = await pool.query(sql, clause.params);
  return rows.map(rowToFile);
}

export async function getFileWithinScope(
  fileId: string,
  scope: FileScope
): Promise<FileRecord | null> {
  const clause = buildFileScopeClause(scope, 'f', 2);
  if (!clause) return null;

  const sql = `
    SELECT
      f.id, f.original_name, f.storage_name, f.mime_type, f.size_bytes,
      f.owner_id, f.area_id, f.uploaded_at,
      u.full_name AS owner_name,
      u.email AS owner_email,
      a.name AS area_name
    FROM files f
    INNER JOIN users u ON u.id = f.owner_id
    LEFT JOIN areas a ON a.id = f.area_id
    WHERE f.id = $1
      AND f.is_deleted = FALSE
      AND (${clause.clause})
    LIMIT 1
  `;

  const { rows } = await pool.query(sql, [fileId, ...clause.params]);
  return rows[0] ? rowToFile(rows[0]) : null;
}

export async function insertFile(params: {
  originalName: string;
  storageName: string;
  mimeType: string;
  sizeBytes: number;
  ownerId: string;
  areaId: string | null;
}): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO files (original_name, storage_name, mime_type, size_bytes, owner_id, area_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      params.originalName,
      params.storageName,
      params.mimeType,
      params.sizeBytes,
      params.ownerId,
      params.areaId,
    ]
  );
  return rows[0].id;
}

export async function softDeleteFile(fileId: string, deletedBy: string): Promise<void> {
  await pool.query(
    `UPDATE files
     SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2
     WHERE id = $1 AND is_deleted = FALSE`,
    [fileId, deletedBy]
  );
}

function rowToFile(row: Record<string, unknown>): FileRecord {
  return {
    id: row.id as string,
    originalName: row.original_name as string,
    storageName: row.storage_name as string,
    mimeType: row.mime_type as string,
    sizeBytes: Number(row.size_bytes),
    ownerId: row.owner_id as string,
    ownerName: row.owner_name as string,
    ownerEmail: row.owner_email as string,
    areaId: row.area_id as string | null,
    areaName: row.area_name as string | null,
    uploadedAt: row.uploaded_at as Date,
  };
}
