import { AuthenticatedUser } from '../types';

export type FileScope =
  | { kind: 'none' }
  | { kind: 'own'; userId: string }
  | { kind: 'area'; areaId: string }
  | { kind: 'areas'; areaIds: string[] }
  | { kind: 'all' };

export function getViewableFilesScope(user: AuthenticatedUser): FileScope {
  switch (user.roleCode) {
    case 'ADMIN':
      return { kind: 'all' };
    case 'MANAGER':
      return user.managedAreaIds.length > 0
        ? { kind: 'areas', areaIds: user.managedAreaIds }
        : { kind: 'none' };
    case 'CHIEF':
      return user.areaId
        ? { kind: 'area', areaId: user.areaId }
        : { kind: 'none' };
    case 'USER':
      return { kind: 'own', userId: user.id };
  }
}

export function getDownloadableFilesScope(user: AuthenticatedUser): FileScope {
  return getViewableFilesScope(user);
}

export function getDeletableFilesScope(user: AuthenticatedUser): FileScope {
  switch (user.roleCode) {
    case 'ADMIN':
      return { kind: 'all' };
    case 'MANAGER':
      return user.managedAreaIds.length > 0
        ? { kind: 'areas', areaIds: user.managedAreaIds }
        : { kind: 'none' };
    case 'CHIEF':
    case 'USER':
      return { kind: 'own', userId: user.id };
  }
}

export function getAuditScope(user: AuthenticatedUser): FileScope {
  switch (user.roleCode) {
    case 'ADMIN':
      return { kind: 'all' };
    case 'MANAGER':
      return user.managedAreaIds.length > 0
        ? { kind: 'areas', areaIds: user.managedAreaIds }
        : { kind: 'none' };
    case 'CHIEF':
      return user.areaId
        ? { kind: 'area', areaId: user.areaId }
        : { kind: 'none' };
    case 'USER':
      return { kind: 'own', userId: user.id };
  }
}

export function buildFileScopeClause(
  scope: FileScope,
  tableAlias: string,
  startParamIndex: number
): { clause: string; params: unknown[] } | null {
  const t = tableAlias;
  switch (scope.kind) {
    case 'none':
      return null;
    case 'all':
      return { clause: 'TRUE', params: [] };
    case 'own':
      return {
        clause: `${t}.owner_id = $${startParamIndex}`,
        params: [scope.userId],
      };
    case 'area':
      return {
        clause: `${t}.area_id = $${startParamIndex}`,
        params: [scope.areaId],
      };
    case 'areas':
      return {
        clause: `${t}.area_id = ANY($${startParamIndex}::uuid[])`,
        params: [scope.areaIds],
      };
  }
}
