import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../core/services/auth.service';
import { FilesService } from '../../core/services/files.service';
import { FileItem } from '../../core/models';
import { canDeleteFile, formatBytes, formatDate } from '../../core/utils/helpers';

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
  ],
  templateUrl: './files.component.html',
  styleUrl: './files.component.css',
})
export class FilesComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly filesService = inject(FilesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly files = signal<FileItem[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);

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

  ngOnInit(): void {
    this.refresh();
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

    this.uploading.set(true);
    this.filesService.upload(file).subscribe({
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
