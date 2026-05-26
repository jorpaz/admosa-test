import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(null);
  readonly loading = signal(false);

  login(email: string, password: string) {
    this.loading.set(true);
    return this.http
      .post<{ user: User }>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap({
          next: ({ user }) => this.user.set(user),
          finalize: () => this.loading.set(false),
        })
      );
  }

  logout() {
    return this.http.post(`${environment.apiUrl}/auth/logout`, {}).pipe(
      tap(() => {
        this.user.set(null);
        this.router.navigate(['/login']);
      })
    );
  }

  loadMe() {
    return this.http.get<{ user: User }>(`${environment.apiUrl}/auth/me`).pipe(
      tap({
        next: ({ user }) => this.user.set(user),
        error: () => this.user.set(null),
      })
    );
  }

  isAdmin(): boolean {
    return this.user()?.roleCode === 'ADMIN';
  }
}
