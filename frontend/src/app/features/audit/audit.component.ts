import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AuthService } from '../../core/services/auth.service';
import { AuditService } from '../../core/services/audit.service';
import { ACTION_LABELS, AuditEntry, AuditFilters, User } from '../../core/models';
import { auditScopeHint, formatDate, workspaceLabel } from '../../core/utils/helpers';

@Component({
  selector: 'app-audit',
  imports: [
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatPaginatorModule,
  ],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css',
})
export class AuditComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly auditService = inject(AuditService);

  readonly entries = signal<AuditEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly filtersLoading = signal(true);
  readonly filterOptions = signal<AuditFilters>({ users: [], actions: [], areas: [] });

  readonly selectedUserId = signal('');
  readonly selectedAction = signal('');
  readonly selectedAreaId = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(25);

  readonly actionLabels = ACTION_LABELS;
  readonly formatDate = formatDate;
  readonly auditScopeHint = auditScopeHint;
  readonly workspaceLabel = workspaceLabel;

  readonly displayedColumns = ['occurredAt', 'action', 'user', 'file', 'ip'];

  readonly hasActiveFilters = computed(
    () => !!(this.selectedUserId() || this.selectedAction() || this.selectedAreaId())
  );

  readonly showUserFilter = computed(() => {
    const role = this.auth.user()?.roleCode;
    if (!role || role === 'USER') return false;
    return this.filterOptions().users.length > 1;
  });

  readonly showAreaFilter = computed(() => {
    const role = this.auth.user()?.roleCode;
    if (!role) return false;
    if (role === 'MANAGER' || role === 'ADMIN') {
      return this.filterOptions().areas.length > 0;
    }
    return this.filterOptions().areas.length > 1;
  });

  readonly showActionFilter = computed(() => this.filterOptions().actions.length > 0);

  readonly hasAnyFilter = computed(
    () => this.showUserFilter() || this.showAreaFilter() || this.showActionFilter()
  );

  ngOnInit(): void {
    this.loadFilters();
    this.loadEntries();
  }

  actionLabel(action: string): string {
    return this.actionLabels[action] ?? action;
  }

  selectedUserLabel(): string {
    const id = this.selectedUserId();
    if (!id) return '—';
    return this.filterOptions().users.find((u) => u.id === id)?.fullName ?? '—';
  }

  selectedAreaLabel(): string {
    const id = this.selectedAreaId();
    if (!id) return '—';
    return this.filterOptions().areas.find((a) => a.id === id)?.name ?? '—';
  }

  actionChipClass(action: string): string {
    return `action-chip action-chip--${action.toLowerCase()}`;
  }

  onFilterChange(): void {
    this.pageIndex.set(0);
    this.loadEntries();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadEntries();
  }

  clearFilters(): void {
    this.selectedUserId.set('');
    this.selectedAction.set('');
    this.selectedAreaId.set('');
    this.pageIndex.set(0);
    this.loadEntries();
  }

  refresh(): void {
    this.loadFilters();
    this.loadEntries();
  }

  private loadFilters(): void {
    this.filtersLoading.set(true);
    this.auditService.filters().subscribe({
      next: (options) => {
        this.filterOptions.set(this.enrichFilterOptions(options));
        this.filtersLoading.set(false);
      },
      error: () => this.loadFiltersFallback(),
    });
  }

  /** Si /audit/filters no está disponible, reconstruye opciones desde el listado. */
  private loadFiltersFallback(): void {
    this.auditService.list({ limit: 200, offset: 0 }).subscribe({
      next: ({ entries }) => {
        this.filterOptions.set(this.enrichFilterOptions(this.buildFiltersFromEntries(entries)));
        this.filtersLoading.set(false);
      },
      error: () => this.filtersLoading.set(false),
    });
  }

  private enrichFilterOptions(options: AuditFilters): AuditFilters {
    const user = this.auth.user();
    if (!user) return options;

    const areas = new Map(options.areas.map((area) => [area.id, area]));
    this.managedAreasForRole(user).forEach((area) => areas.set(area.id, area));

    return {
      ...options,
      areas: [...areas.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  private managedAreasForRole(user: User): { id: string; name: string }[] {
    if (user.roleCode === 'MANAGER') {
      return user.managedAreaIds.map((id, index) => ({
        id,
        name: user.managedAreaNames[index] ?? 'Área gestionada',
      }));
    }
    if (user.roleCode === 'CHIEF' && user.areaId) {
      return [{ id: user.areaId, name: user.areaName ?? 'Mi área' }];
    }
    return [];
  }

  private buildFiltersFromEntries(entries: AuditEntry[]): AuditFilters {
    const users = new Map<string, { id: string; fullName: string; email: string }>();
    const actions = new Set<string>();

    for (const entry of entries) {
      actions.add(entry.action);
      if (entry.user) {
        users.set(entry.user.id, entry.user);
      }
    }

    return {
      users: [...users.values()].sort((a, b) => a.fullName.localeCompare(b.fullName)),
      actions: [...actions].sort(),
      areas: [],
    };
  }

  private loadEntries(): void {
    this.loading.set(true);

    this.auditService
      .list({
        limit: this.pageSize(),
        offset: this.pageIndex() * this.pageSize(),
        userId: this.selectedUserId() || undefined,
        action: this.selectedAction() || undefined,
        areaId: this.selectedAreaId() || undefined,
      })
      .subscribe({
        next: ({ entries, total }) => {
          this.entries.set(entries);
          this.total.set(total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
