import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { listAudit } from './audit.controller';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(listAudit));

export default router;
