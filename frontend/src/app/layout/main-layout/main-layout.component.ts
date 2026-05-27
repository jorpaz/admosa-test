import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '../../core/services/auth.service';
import { roleBadgeColor, workspaceLabel } from '../../core/utils/helpers';
import { ROLE_LABELS, RoleCode } from '../../core/models';
import { BrandLogoComponent } from '../../shared/brand-logo/brand-logo.component';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    BrandLogoComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly breakpoint = inject(BreakpointObserver);

  readonly sidenavOpened = signal(true);
  readonly isHandset = signal(false);
  readonly roleLabels = ROLE_LABELS;
  readonly workspaceLabel = workspaceLabel;

  constructor() {
    this.breakpoint.observe([Breakpoints.Handset]).subscribe((result) => {
      this.isHandset.set(result.matches);
      this.sidenavOpened.set(!result.matches);
    });
  }

  roleColor(role: RoleCode | undefined): string {
    return role ? roleBadgeColor(role) : '#42a5f5';
  }

  logout(): void {
    this.auth.logout().subscribe();
  }
}
