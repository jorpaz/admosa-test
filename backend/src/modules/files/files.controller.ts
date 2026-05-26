import { Request, Response } from 'express';
import { z } from 'zod';
import { fileStorage } from '../../services/fileStorage';
import {
  getViewableFilesScope,
  getDownloadableFilesScope,
  getDeletableFilesScope,
} from '../../services/permissionService';
import {
  insertFile,
  listFiles,
  getFileWithinScope,
  softDeleteFile,
} from './files.repository';
import { logAudit } from '../../services/auditService';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';

const uuidSchema = z.string().uuid();

export async function upload(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ValidationError('No se recibió ningún archivo (campo esperado: "file")');
  }

  const user = req.user!;
  const storageName = fileStorage.generateStorageName();

  try {
    // 1. Persistir en disco PRIMERO. Si falla, no se crea registro.
    await fileStorage.save(storageName, req.file.buffer);

    // 2. Registrar en DB. Si falla, hay que limpiar el disco.
    const fileId = await insertFile({
      originalName: req.file.originalname,
      storageName,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      ownerId: user.id,
      areaId: user.areaId,
    });

    await logAudit({
      userId: user.id,
      fileId,
      action: 'FILE_UPLOAD',
      metadata: { name: req.file.originalname, size: req.file.size, mime: req.file.mimetype },
      ipAddress: req.ip || null,
    });

    res.status(201).json({
      file: {
        id: fileId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
      },
    });
  } catch (err) {
    // Compensación: si la DB falló, limpiar archivo huérfano
    await fileStorage.delete(storageName).catch(() => undefined);
    throw err;
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const scope = getViewableFilesScope(user);
  const files = await listFiles(scope);

  await logAudit({
    userId: user.id,
    action: 'FILE_VIEW_LIST',
    metadata: { count: files.length },
    ipAddress: req.ip || null,
  });

  res.json({
    files: files.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      ownerId: f.ownerId,
      ownerName: f.ownerName,
      ownerEmail: f.ownerEmail,
      areaId: f.areaId,
      areaName: f.areaName,
      uploadedAt: f.uploadedAt,
    })),
  });
}

export async function download(req: Request, res: Response): Promise<void> {
  const fileId = uuidSchema.parse(req.params.id);
  const user = req.user!;
  const scope = getDownloadableFilesScope(user);

  const file = await getFileWithinScope(fileId, scope);
  if (!file) {
    await logAudit({
      userId: user.id,
      fileId,
      action: 'FILE_ACCESS_DENIED',
      metadata: { intent: 'download' },
      ipAddress: req.ip || null,
    });
    // No revelamos si el archivo existe o no: misma respuesta para ambos casos
    throw new NotFoundError('Archivo no encontrado o sin acceso');
  }

  if (!(await fileStorage.exists(file.storageName))) {
    throw new NotFoundError('Archivo no disponible en almacenamiento');
  }

  await logAudit({
    userId: user.id,
    fileId,
    action: 'FILE_DOWNLOAD',
    metadata: { name: file.originalName, size: file.sizeBytes },
    ipAddress: req.ip || null,
  });

  // Encabezados seguros — Content-Disposition con escapado del nombre
  const safeName = file.originalName.replace(/"/g, '');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', file.sizeBytes);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
  );

  // Stream para no cargar todo en memoria
  fileStorage.createReadStream(file.storageName).pipe(res);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const fileId = uuidSchema.parse(req.params.id);
  const user = req.user!;
  const scope = getDeletableFilesScope(user);

  const file = await getFileWithinScope(fileId, scope);
  if (!file) {
    // Distinguir entre "no existe" y "no puedes": para los logs sí distinguimos
    // (operativamente útil), pero para el usuario la respuesta es la misma.
    const viewableScope = getViewableFilesScope(user);
    const visible = await getFileWithinScope(fileId, viewableScope);
    await logAudit({
      userId: user.id,
      fileId,
      action: 'FILE_ACCESS_DENIED',
      metadata: { intent: 'delete', reason: visible ? 'not_owner' : 'not_visible' },
      ipAddress: req.ip || null,
    });
    if (visible) {
      throw new ForbiddenError('No tienes permiso para eliminar este archivo');
    }
    throw new NotFoundError('Archivo no encontrado');
  }

  // Soft delete en DB; el archivo físico se conserva por si se quiere recuperar
  await softDeleteFile(fileId, user.id);

  await logAudit({
    userId: user.id,
    fileId,
    action: 'FILE_DELETE',
    metadata: { name: file.originalName, ownerWas: file.ownerId },
    ipAddress: req.ip || null,
  });

  res.json({ ok: true });
}
