import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'files', pathMatch: 'full' },
      {
        path: 'files',
        loadComponent: () => import('./features/files/files.component').then((m) => m.FilesComponent),
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit.component').then((m) => m.AuditComponent),
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent),
        canActivate: [adminGuard],
      },
    ],
  },
  { path: '**', redirectTo: 'files' },
];
