import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FileItem } from '../models';

@Injectable({ providedIn: 'root' })
export class FilesService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<{ files: FileItem[] }>(`${environment.apiUrl}/files`);
  }

  upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ file: FileItem }>(`${environment.apiUrl}/files`, form);
  }

  download(id: string, filename: string) {
    return this.http
      .get(`${environment.apiUrl}/files/${id}/download`, { responseType: 'blob' })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      });
  }

  remove(id: string) {
    return this.http.delete(`${environment.apiUrl}/files/${id}`);
  }
}
