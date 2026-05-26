import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.user()) {
    return true;
  }

  return auth.loadMe().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.user()) {
    router.navigate(['/files']);
    return false;
  }

  return auth.loadMe().pipe(
    map(() => {
      if (auth.user()) {
        router.navigate(['/files']);
        return false;
      }
      return true;
    }),
    catchError(() => of(true))
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAdmin()) {
    router.navigate(['/files']);
    return false;
  }
  return true;
};
