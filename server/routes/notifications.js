/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 */
import { Router } from 'express';
import { listNotifications, markNotificationRead } from '../lib/data-store.js';
import { AppError, asyncHandler } from '../middleware/error-handler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const notifications = listNotifications({
      role: req.query.role,
      recipient_id: req.query.recipient_id,
      unread_only: req.query.unread === 'true',
    });
    res.json({ notifications, requirement_id: 'REQ-SALES-001' });
  }),
);

router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notification = markNotificationRead(req.params.id);
    if (!notification) throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    res.json(notification);
  }),
);

export default router;
