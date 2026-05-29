import { FileScope, buildFileScopeClause } from '../../services/permissionService';

export interface AuditListFilters {
  userId?: string;
  action?: string;
  areaId?: string;
}

export interface AuditScopeQuery {
  whereClause: string;
  params: unknown[];
}

export function buildAuditScopeQuery(scope: FileScope): AuditScopeQuery | null {
  const params: unknown[] = [];

  if (scope.kind === 'none') {
    return null;
  }

  if (scope.kind === 'all') {
    return { whereClause: 'TRUE', params };
  }

  if (scope.kind === 'own') {
    params.push(scope.userId);
    return { whereClause: `al.user_id = $${params.length}`, params };
  }

  const clause = buildFileScopeClause(scope, 'f', params.length + 1);
  if (!clause) {
    return null;
  }

  params.push(...clause.params);
  return {
    whereClause: `al.file_id IS NOT NULL AND (${clause.clause})`,
    params,
  };
}

export function appendAuditListFilters(
  base: AuditScopeQuery,
  filters: AuditListFilters
): AuditScopeQuery {
  const params = [...base.params];
  let whereClause = base.whereClause;

  if (filters.userId) {
    params.push(filters.userId);
    whereClause += ` AND al.user_id = $${params.length}`;
  }

  if (filters.action) {
    params.push(filters.action);
    whereClause += ` AND al.action = $${params.length}`;
  }

  if (filters.areaId) {
    params.push(filters.areaId);
    whereClause += ` AND f.area_id = $${params.length}`;
  }

  return { whereClause, params };
}

export function mapAuditRow(r: {
  id: string;
  action: string;
  metadata: unknown;
  occurred_at: Date;
  ip_address: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  file_id: string | null;
  file_name: string | null;
}) {
  return {
    id: r.id,
    action: r.action,
    metadata: r.metadata,
    occurredAt: r.occurred_at,
    ipAddress: r.ip_address,
    user: r.user_id
      ? { id: r.user_id, email: r.user_email!, fullName: r.user_name! }
      : null,
    file: r.file_id ? { id: r.file_id, name: r.file_name! } : null,
  };
}
