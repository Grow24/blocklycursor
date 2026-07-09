/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 * Acceptance Criteria: AC-REQ-SALES-001-1
 */
import { Router } from 'express';
import { listTasks } from '../lib/data-store.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tasks = listTasks({
      lead_id: req.query.lead_id,
      assigned_role: req.query.assigned_role,
      status: req.query.status,
    });
    res.json({ tasks, requirement_id: 'REQ-SALES-001' });
  }),
);

export default router;
