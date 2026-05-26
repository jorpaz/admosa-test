import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AdminUser, Area, Role, RoleCode } from '../models';

export interface CreateUserPayload {
  email: string;
  fullName: string;
  password: string;
  roleCode: RoleCode;
  areaId?: string | null;
}

export interface UpdateUserPayload {
  fullName?: string;
  roleCode?: RoleCode;
  areaId?: string | null;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  listUsers() {
    return this.http.get<{ users: AdminUser[] }>(`${environment.apiUrl}/admin/users`);
  }

  createUser(payload: CreateUserPayload) {
    return this.http.post<{ id: string }>(`${environment.apiUrl}/admin/users`, payload);
  }

  updateUser(id: string, payload: UpdateUserPayload) {
    return this.http.patch(`${environment.apiUrl}/admin/users/${id}`, payload);
  }

  listAreas() {
    return this.http.get<{ areas: Area[] }>(`${environment.apiUrl}/admin/areas`);
  }

  listRoles() {
    return this.http.get<{ roles: Role[] }>(`${environment.apiUrl}/admin/roles`);
  }
}
