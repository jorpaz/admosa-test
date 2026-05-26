import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AuditService } from '../../core/services/audit.service';
import { AuditEntry, ACTION_LABELS } from '../../core/models';
import { formatDate } from '../../core/utils/helpers';

@Component({
  selector: 'app-audit',
  imports: [
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css',
})
export class AuditComponent implements OnInit {
  private readonly auditService = inject(AuditService);

  readonly entries = signal<AuditEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly actionLabels = ACTION_LABELS;
  readonly formatDate = formatDate;

  readonly displayedColumns = ['occurredAt', 'action', 'user', 'file', 'ip'];

  ngOnInit(): void {
    this.auditService.list().subscribe({
      next: ({ entries, total }) => {
        this.entries.set(entries);
        this.total.set(total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  actionLabel(action: string): string {
    return this.actionLabels[action] ?? action;
  }
}
