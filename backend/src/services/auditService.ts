import { pool } from '../config/db';
import { AuditAction } from '../types';

interface AuditEntry {
  userId: string | null;
  fileId?: string | null;
  action: AuditAction;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Registra una acción en el historial. Es "fire and forget" intencional:
 * un fallo en auditoría NUNCA debe romper la operación principal.
 * En su lugar, loguea a stderr para que sea visible en monitoreo.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, file_id, action, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.userId,
        entry.fileId ?? null,
        entry.action,
        entry.metadata ?? {},
        entry.ipAddress ?? null,
      ]
    );
  } catch (err) {
    console.error('[AUDIT_FAILURE]', { entry, err });
  }
}
