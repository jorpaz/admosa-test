export type RoleCode = 'USER' | 'CHIEF' | 'MANAGER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  roleCode: RoleCode;
  areaId: string | null;
  areaCode: string | null;
  areaName: string | null;
  managedAreaIds: string[];
  managedAreaNames: string[];
}

export interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  areaId: string | null;
  areaName: string | null;
  uploadedAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  ipAddress: string | null;
  user: { id: string; email: string; fullName: string } | null;
  file: { id: string; name: string } | null;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roleCode: RoleCode;
  roleName: string;
  areaId: string | null;
  areaName: string | null;
  createdAt: string;
}

export interface Area {
  id: string;
  code: string;
  name: string;
}

export interface Role {
  id: string;
  code: RoleCode;
  name: string;
  description: string;
}

export const ROLE_LABELS: Record<RoleCode, string> = {
  USER: 'Usuario',
  CHIEF: 'Jefe de área',
  MANAGER: 'Gerente',
  ADMIN: 'Administrador',
};

export const ACTION_LABELS: Record<string, string> = {
  FILE_UPLOAD: 'Archivo subido',
  FILE_DOWNLOAD: 'Archivo descargado',
  FILE_DELETE: 'Archivo eliminado',
  FILE_VIEW_LIST: 'Listado de archivos',
  FILE_ACCESS_DENIED: 'Acceso denegado',
  LOGIN_SUCCESS: 'Inicio de sesión',
  LOGIN_FAILURE: 'Intento fallido',
  LOGOUT: 'Cierre de sesión',
  USER_CREATE: 'Usuario creado',
  USER_UPDATE: 'Usuario actualizado',
};
