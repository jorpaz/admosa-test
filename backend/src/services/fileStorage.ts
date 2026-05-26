import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

/**
 * Servicio de almacenamiento físico de archivos.
 *
 * Garantías:
 * - El nombre en disco es un UUID, NUNCA el nombre original (evita colisiones,
 *   path traversal, e información sensible en el filesystem).
 * - Los archivos viven FUERA del webroot y nunca se sirven estáticamente.
 *   El acceso pasa siempre por el controlador (que valida permisos).
 * - Validación de path: cualquier intento de acceder fuera de STORAGE_PATH
 *   lanza error.
 */

export class FileStorage {
  private readonly basePath: string;

  constructor(basePath: string = env.STORAGE_PATH_ABS) {
    this.basePath = path.resolve(basePath);
  }

  async ensureReady(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
  }

  /**
   * Genera un nombre de almacenamiento único.
   * Formato: <uuid>.bin — sin extensión real, para no dar pistas al filesystem.
   */
  generateStorageName(): string {
    return `${uuidv4()}.bin`;
  }

  /**
   * Resuelve un nombre de almacenamiento a ruta absoluta segura.
   * Throws si el resultado escapa de basePath (defensa contra path traversal).
   */
  resolvePath(storageName: string): string {
    const resolved = path.resolve(this.basePath, storageName);
    if (!resolved.startsWith(this.basePath + path.sep) && resolved !== this.basePath) {
      throw new Error('Path traversal detected');
    }
    // Defensa adicional: el nombre no debe contener separadores
    if (storageName.includes('/') || storageName.includes('\\') || storageName.includes('..')) {
      throw new Error('Invalid storage name');
    }
    return resolved;
  }

  async save(storageName: string, buffer: Buffer): Promise<void> {
    const filePath = this.resolvePath(storageName);
    await fs.writeFile(filePath, buffer);
  }

  async read(storageName: string): Promise<Buffer> {
    const filePath = this.resolvePath(storageName);
    return fs.readFile(filePath);
  }

  createReadStream(storageName: string) {
    // Para descargas grandes vía stream sin cargar todo en memoria
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createReadStream } = require('fs');
    return createReadStream(this.resolvePath(storageName));
  }

  async delete(storageName: string): Promise<void> {
    const filePath = this.resolvePath(storageName);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // Si ya no existe, no es error fatal
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  async exists(storageName: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(storageName));
      return true;
    } catch {
      return false;
    }
  }
}

export const fileStorage = new FileStorage();
