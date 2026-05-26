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
