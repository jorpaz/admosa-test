import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/services/auth.service';
import { FilesService } from '../../core/services/files.service';
import { FileItem, ROLE_LABELS } from '../../core/models';
import {
  canDeleteFile,
  deleteBlockedReason,
  formatBytes,
  formatDate,
  isOwnFile,
  permissionsHint,
  workspaceLabel,
} from '../../core/utils/helpers';

@Component({
  selector: 'app-files',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './files.component.html',
  styleUrl: './files.component.css',
})
export class FilesComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly filesService = inject(FilesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly allAreasValue = 'ALL';

  readonly files = signal<FileItem[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly selectedAreaId = signal<string>(this.allAreasValue);

  readonly filteredFiles = computed(() => {
    const all = this.files();
    const selected = this.selectedAreaId();
    if (!this.needsAreaSelector() || selected === this.allAreasValue) {
      return all;
    }
    return all.filter((file) => file.areaId === selected);
  });

  readonly selectedAreaLabel = computed(() => {
    if (this.selectedAreaId() === this.allAreasValue) {
      return 'Todas las áreas';
    }
    return (
      this.managedAreasForUpload().find((area) => area.id === this.selectedAreaId())?.name ?? '—'
    );
  });

  readonly displayedColumns = [
    'name',
    'owner',
    'area',
    'size',
    'uploadedAt',
    'actions',
  ];

  readonly formatBytes = formatBytes;
  readonly formatDate = formatDate;
  readonly workspaceLabel = workspaceLabel;
  readonly permissionsHint = permissionsHint;
  readonly deleteBlockedReason = deleteBlockedReason;
  readonly isOwnFile = isOwnFile;
  readonly roleLabels = ROLE_LABELS;

  ngOnInit(): void {
    this.refresh();
  }

  needsAreaSelector(): boolean {
    const user = this.auth.user();
    return user?.roleCode === 'MANAGER' && user.managedAreaIds.length > 1;
  }

  managedAreasForUpload(): { id: string; name: string }[] {
    const user = this.auth.user();
    if (!user) return [];
    return user.managedAreaIds.map((id, index) => ({
      id,
      name: user.managedAreaNames[index] ?? id,
    }));
  }

  private resolveUploadAreaId(): string | undefined {
    const user = this.auth.user();
    if (!user || user.roleCode !== 'MANAGER') {
      return undefined;
    }
    const selected = this.selectedAreaId();
    if (selected === this.allAreasValue) {
      return undefined;
    }
    return selected;
  }

  refresh(): void {
    this.loading.set(true);
    this.filesService.list().subscribe({
      next: ({ files }) => {
        this.files.set(files);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar los archivos', 'Cerrar', { duration: 4000 });
      },
    });
  }

  canDelete(file: FileItem): boolean {
    const user = this.auth.user();
    return user ? canDeleteFile(user, file) : false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const areaId = this.resolveUploadAreaId();
    if (this.needsAreaSelector() && !areaId) {
      this.snackBar.open('Selecciona un área antes de subir el archivo', 'Cerrar', { duration: 4000 });
      return;
    }

    this.uploading.set(true);
    this.filesService.upload(file, areaId).subscribe({
      next: () => {
        this.uploading.set(false);
        input.value = '';
        this.snackBar.open('Archivo subido correctamente', 'OK', { duration: 3000 });
        this.refresh();
      },
      error: (err) => {
        this.uploading.set(false);
        input.value = '';
        const msg = err?.error?.error?.message ?? 'Error al subir el archivo';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }

  download(file: FileItem): void {
    this.filesService.download(file.id, file.originalName);
  }

  delete(file: FileItem): void {
    if (!confirm(`¿Eliminar "${file.originalName}"?`)) return;

    this.filesService.remove(file.id).subscribe({
      next: () => {
        this.snackBar.open('Archivo eliminado', 'OK', { duration: 3000 });
        this.refresh();
      },
      error: (err) => {
        const msg = err?.error?.error?.message ?? 'No se pudo eliminar el archivo';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
      },
    });
  }
}
