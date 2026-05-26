import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuditEntry } from '../models';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  list(limit = 50, offset = 0) {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<{ entries: AuditEntry[]; total: number }>(
      `${environment.apiUrl}/audit`,
      { params }
    );
  }
}
