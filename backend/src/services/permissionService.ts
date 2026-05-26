import { AuthenticatedUser } from '../types';

/**
 * Servicio de permisos centralizado.
 *
 * Principio de diseño: TODA decisión de acceso a archivos pasa por este servicio.
 * No hay autorización dispersa en controladores. Si un permiso cambia, se cambia
 * en un único lugar.
 *
 * Convención: cada función retorna un "scope" (alcance) que el repositorio
 * traduce a una cláusula WHERE. Esto evita el anti-patrón "traer todo y filtrar
 * en memoria", que es lento y propenso a bugs de seguridad.
 */

export type FileScope =
  | { kind: 'none' }
  | { kind: 'own'; userId: string }
  | { kind: 'area'; areaId: string }
  | { kind: 'areas'; areaIds: string[] }
  | { kind: 'all' };

/**
 * Determina qué archivos puede VISUALIZAR (listar) el usuario.
 */
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

/**
 * Determina qué archivos puede DESCARGAR el usuario.
 * Por diseño coincide con el scope de visualización (no se puede descargar
 * lo que no se puede ver), pero lo separamos para que sea fácil divergir.
 */
export function getDownloadableFilesScope(user: AuthenticatedUser): FileScope {
  return getViewableFilesScope(user);
}

/**
 * Determina qué archivos puede ELIMINAR el usuario.
 *
 * Nota importante: el Jefe de área puede VER archivos de su área pero
 * solo puede ELIMINAR los suyos. Esto es asimétrico respecto a la visualización.
 */
export function getDeletableFilesScope(user: AuthenticatedUser): FileScope {
  switch (user.roleCode) {
    case 'ADMIN':
      return { kind: 'all' };
    case 'MANAGER':
      return user.managedAreaIds.length > 0
        ? { kind: 'areas', areaIds: user.managedAreaIds }
        : { kind: 'none' };
    case 'CHIEF':
      // El enunciado es explícito: "No podrá eliminar archivos de otros usuarios"
      return { kind: 'own', userId: user.id };
    case 'USER':
      return { kind: 'own', userId: user.id };
  }
}

/**
 * Scope para consulta del historial.
 */
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

/**
 * Construye fragmento SQL para filtrar archivos según el scope.
 * Retorna `null` si el scope es 'none' (el caller debe corto-circuitar).
 *
 * @param scope    Scope determinado por las funciones anteriores
 * @param tableAlias Alias de la tabla files en la query (ej. 'f')
 * @param startParamIndex Índice de inicio para placeholders ($1, $2, ...)
 * @returns { clause, params } o null si no hay acceso
 */
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
