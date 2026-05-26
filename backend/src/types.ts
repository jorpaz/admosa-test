export type RoleCode = 'USER' | 'CHIEF' | 'MANAGER' | 'ADMIN';

export interface AuthenticatedUser {
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

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'FILE_UPLOAD'
  | 'FILE_VIEW_LIST'
  | 'FILE_DOWNLOAD'
  | 'FILE_DELETE'
  | 'FILE_ACCESS_DENIED'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}
