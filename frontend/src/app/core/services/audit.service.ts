import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuditEntry, AuditFilters, AuditListParams } from '../models';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  list(params: AuditListParams = {}) {
    let httpParams = new HttpParams();
    const entries = Object.entries(params) as [keyof AuditListParams, string | number | undefined][];

    for (const [key, value] of entries) {
      if (value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return this.http.get<{ entries: AuditEntry[]; total: number }>(
      `${environment.apiUrl}/audit`,
      { params: httpParams }
    );
  }

  filters() {
    return this.http.get<AuditFilters>(`${environment.apiUrl}/audit/filters`);
  }
}
