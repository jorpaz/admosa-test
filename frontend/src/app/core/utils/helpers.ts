import { FileItem, RoleCode, User } from '../models';

export function canDeleteFile(user: User, file: FileItem): boolean {
  switch (user.roleCode) {
    case 'ADMIN':
      return true;
    case 'MANAGER':
      return file.areaId != null && user.managedAreaIds.includes(file.areaId);
    case 'CHIEF':
    case 'USER':
      return file.ownerId === user.id;
  }
}

/** Texto de ayuda según el rol activo (banner de permisos). */
export function permissionsHint(user: User): string {
  switch (user.roleCode) {
    case 'USER':
      return 'Solo ves tus archivos. Puedes descargar y eliminar únicamente los que subiste.';
    case 'CHIEF':
      return 'Ves los archivos de tu área y puedes descargarlos. Solo puedes eliminar los que subiste tú.';
    case 'MANAGER':
      return 'Ves archivos de tus áreas gestionadas. Puedes descargar y eliminar los de tu alcance.';
    case 'ADMIN':
      return 'Ves todos los archivos. Puedes descargar y eliminar cualquiera.';
  }
}

/** Motivo por el que no se puede eliminar; null si sí puede. */
export function deleteBlockedReason(user: User, file: FileItem): string | null {
  if (canDeleteFile(user, file)) return null;

  switch (user.roleCode) {
    case 'USER':
      return 'Solo puedes eliminar archivos que hayas subido tú.';
    case 'CHIEF':
      return 'Puedes ver y descargar archivos de tu área, pero solo eliminar los propios.';
    case 'MANAGER':
      return 'Este archivo está fuera de las áreas que gestionas.';
    default:
      return 'No tienes permiso para eliminar este archivo.';
  }
}

export function isOwnFile(user: User, file: FileItem): boolean {
  return file.ownerId === user.id;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** Etiqueta legible del área de trabajo según rol. */
export function workspaceLabel(user: User): string {
  switch (user.roleCode) {
    case 'ADMIN':
      return 'Todas las áreas';
    case 'MANAGER': {
      const names = user.managedAreaNames ?? [];
      if (names.length > 0) return names.join(' · ');
      const count = user.managedAreaIds?.length ?? 0;
      return count > 0 ? `${count} áreas gestionadas` : 'Sin áreas asignadas';
    }
    default:
      if (user.areaName) return user.areaName;
      if (user.areaId) return 'Área asignada';
      return 'Sin área asignada';
  }
}

export function auditScopeHint(user: User): string {
  switch (user.roleCode) {
    case 'USER':
      return 'Ves únicamente tus propias acciones registradas en la plataforma.';
    case 'CHIEF':
      return 'Ves acciones sobre archivos de tu área. Filtra por usuario o tipo de acción para revisar la actividad.';
    case 'MANAGER':
      return 'Ves acciones sobre archivos de tus áreas gestionadas. Filtra por usuario, área o tipo de acción.';
    case 'ADMIN':
      return 'Ves todo el historial del sistema, incluyendo inicios de sesión y gestión de usuarios.';
  }
}

export function roleBadgeColor(role: RoleCode): string {
  switch (role) {
    case 'ADMIN':
      return '#0d47a1';
    case 'MANAGER':
      return '#1565c0';
    case 'CHIEF':
      return '#1976d2';
    default:
      return '#42a5f5';
  }
}
