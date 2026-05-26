import { Router } from 'express';
import multer from 'multer';
import { env } from '../../config/env';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { upload, list, download, remove } from './files.controller';

const router = Router();

// Multer en memoria — el servicio de almacenamiento controla la escritura
// (no dejamos que multer escriba a disco con nombres arbitrarios)
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

router.use(requireAuth);

router.get('/',           asyncHandler(list));
router.post('/',          uploader.single('file'), asyncHandler(upload));
router.get('/:id/download', asyncHandler(download));
router.delete('/:id',     asyncHandler(remove));

export default router;
