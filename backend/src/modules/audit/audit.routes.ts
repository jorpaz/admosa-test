import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { listAudit, getAuditFilters } from './audit.controller';

const router = Router();

router.use(requireAuth);
router.get('/filters', asyncHandler(getAuditFilters));
router.get('/', asyncHandler(listAudit));

export default router;
