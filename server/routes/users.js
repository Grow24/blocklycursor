/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 */
import { Router } from 'express';
import { listUsers } from '../lib/data-store.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ users: listUsers({ role: req.query.role }), requirement_id: 'REQ-SALES-001' });
  }),
);

export default router;
