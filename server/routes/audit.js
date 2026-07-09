/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 * Acceptance Criteria: audit log entry on automated actions
 */
import { Router } from 'express';
import { listAuditLog } from '../lib/data-store.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const entries = listAuditLog({
      entity_type: req.query.entity_type,
      requirement_id: req.query.requirement_id,
    });
    res.json({ audit_log: entries, requirement_id: 'REQ-SALES-001' });
  }),
);

export default router;
