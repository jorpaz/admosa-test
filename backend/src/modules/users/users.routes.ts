import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  listUsers,
  createUser,
  updateUser,
  listAreas,
  listRoles,
} from './users.controller';

const router = Router();

// Toda esta sección requiere ADMIN
router.use(requireAuth, requireRole('ADMIN'));

router.get('/users',      asyncHandler(listUsers));
router.post('/users',     asyncHandler(createUser));
router.patch('/users/:id', asyncHandler(updateUser));

router.get('/areas',      asyncHandler(listAreas));
router.get('/roles',      asyncHandler(listRoles));

export default router;
