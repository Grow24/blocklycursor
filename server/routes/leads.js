/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001, REQ-SALES-005
 * Acceptance Criteria: AC-REQ-SALES-001-1, AC-REQ-SALES-005-1
 */
import { Router } from 'express';
import {
  listLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getUserById,
} from '../lib/data-store.js';
import { onLeadScoreUpdated } from '../lib/rule-engine.js';
import { onLeadScoreUpdatedSales005 } from '../lib/rule-engine-sales-005.js';
import { AppError, asyncHandler } from '../middleware/error-handler.js';

const router = Router();

/**
 * Combines results from multiple rule engines.
 * Requirement: REQ-SALES-001, REQ-SALES-005
 */
function combineRuleResults(results) {
  const combined = {
    triggered: false,
    tasks: [],
    notifications: [],
  };
  for (const result of results) {
    if (result.triggered) {
      combined.triggered = true;
    }
    if (result.tasks) {
      combined.tasks.push(...result.tasks);
    }
    if (result.notifications) {
      combined.notifications.push(...result.notifications);
    }
  }
  return combined;
}

function validateLeadInput(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      errors.push('name is required');
    }
  }
  if (!partial || body.email !== undefined) {
    if (!body.email || typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push('valid email is required');
    }
  }
  if (body.lead_score !== undefined) {
    const score = Number(body.lead_score);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      errors.push('lead_score must be between 0 and 100');
    }
  }
  if (body.assigned_to) {
    if (!getUserById(body.assigned_to)) {
      errors.push('assigned_to user not found');
    }
  }
  return errors;
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ leads: listLeads(), requirement_id: 'REQ-SALES-001' });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const lead = getLeadById(req.params.id);
    if (!lead) throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    res.json(lead);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const errors = validateLeadInput(req.body);
    if (errors.length) throw new AppError(errors.join('; '), 400, 'VALIDATION_ERROR');

    const lead = createLead({
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      company: req.body.company?.trim() || '',
      lead_score: req.body.lead_score ?? 0,
      assigned_to: req.body.assigned_to || null,
      status: req.body.status || 'new',
    });

    res.status(201).json({ lead, rule_result: { triggered: false, tasks: [], notifications: [] } });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = getLeadById(req.params.id);
    if (!existing) throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');

    const errors = validateLeadInput(req.body, { partial: true });
    if (errors.length) throw new AppError(errors.join('; '), 400, 'VALIDATION_ERROR');

    const patch = {};
    if (req.body.name !== undefined) patch.name = req.body.name.trim();
    if (req.body.email !== undefined) patch.email = req.body.email.trim().toLowerCase();
    if (req.body.company !== undefined) patch.company = req.body.company.trim();
    if (req.body.status !== undefined) patch.status = req.body.status;
    if (req.body.assigned_to !== undefined) patch.assigned_to = req.body.assigned_to || null;

    const previousScore = existing.lead_score;
    let ruleResult = { triggered: false, tasks: [], notifications: [] };

    if (req.body.lead_score !== undefined) {
      patch.lead_score = Number(req.body.lead_score);
    }

    const lead = updateLead(req.params.id, patch);
    if (patch.lead_score !== undefined && patch.lead_score !== previousScore) {
      const result001 = onLeadScoreUpdated(lead, previousScore);
      const result005 = onLeadScoreUpdatedSales005(lead, previousScore);
      ruleResult = combineRuleResults([result001, result005]);
    }

    res.json({ lead, rule_result: ruleResult });
  }),
);

router.patch(
  '/:id/score',
  asyncHandler(async (req, res) => {
    const existing = getLeadById(req.params.id);
    if (!existing) throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');

    const score = Number(req.body.lead_score);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      throw new AppError('lead_score must be between 0 and 100', 400, 'VALIDATION_ERROR');
    }

    const previousScore = existing.lead_score;
    const lead = updateLead(req.params.id, { lead_score: score });
    const result001 = onLeadScoreUpdated(lead, previousScore);
    const result005 = onLeadScoreUpdatedSales005(lead, previousScore);
    const ruleResult = combineRuleResults([result001, result005]);

    res.json({ lead, rule_result: ruleResult });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = deleteLead(req.params.id);
    if (!deleted) throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    res.status(204).send();
  }),
);

export default router;
