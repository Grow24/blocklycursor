/**
 * PBMP Traceability
 * Requirement: REQ-SALES-005
 * Acceptance Criteria: AC-REQ-SALES-005-1
 *
 * Tests map to pbmp-implementation-pack/tests/acceptance-criteria.feature
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import request from 'supertest';

let app;
let tempDir;

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'pbmp-lms-test-sales-005-'));
  process.env.PBMP_LMS_DATA_DIR = tempDir;
  process.env.NODE_ENV = 'test';
  const mod = await import('../index.js');
  app = mod.default;
});

after(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(async () => {
  const { resetStoreForTests, seedDefaults } = await import('../lib/data-store.js');
  resetStoreForTests();
  seedDefaults();
});

describe('REQ-SALES-005: Low-score lead follow-up', () => {
  describe('AC-REQ-SALES-005-1: Create task when lead score drops to or below threshold', () => {
    it('does not trigger task creation on lead create without score update', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Create Only Lead',
          email: 'create-only-005@example.com',
          company: 'Create Only Inc',
          lead_score: 35,
        })
        .expect(201);

      assert.equal(createRes.body.rule_result.triggered, false);

      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 0);
    });

    it('creates follow-up task when score updated from 50 to 35 (crosses <= 40 threshold)', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Low Score Lead',
          email: 'low-score@example.com',
          company: 'Low Score Corp',
          lead_score: 50,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      assert.equal(createRes.body.rule_result.triggered, false);

      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 35 })
        .expect(200);

      assert.equal(scoreRes.body.lead.lead_score, 35);
      assert.equal(scoreRes.body.rule_result.triggered, true);
      assert.equal(scoreRes.body.rule_result.tasks.length, 1);
      assert.equal(scoreRes.body.rule_result.tasks[0].title, 'Follow up with customer');
      assert.equal(scoreRes.body.rule_result.tasks[0].assigned_role, 'Product Manager');

      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 1);
      assert.equal(tasksRes.body.tasks[0].lead_id, leadId);
      assert.equal(tasksRes.body.tasks[0].requirement_id, 'REQ-SALES-005');
    });

    it('sends notification to Product Manager when rule triggers', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Notification Lead',
          email: 'notify-lead@example.com',
          company: 'Notify Corp',
          lead_score: 45,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;

      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 40 })
        .expect(200);

      assert.equal(scoreRes.body.rule_result.triggered, true);
      assert.equal(scoreRes.body.rule_result.notifications.length, 1);
      assert.equal(scoreRes.body.rule_result.notifications[0].role, 'Product Manager');
      assert.equal(scoreRes.body.rule_result.notifications[0].message, 'High-score lead needs follow-up');
    });

    it('does not create duplicate task when score stays below threshold', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Repeat Lead',
          email: 'repeat-005@example.com',
          lead_score: 50,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      await request(app).patch(`/api/leads/${leadId}/score`).send({ lead_score: 30 }).expect(200);
      await request(app).patch(`/api/leads/${leadId}/score`).send({ lead_score: 20 }).expect(200);

      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 1);
    });

    it('does not trigger when score drops but stays above threshold', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Above Threshold Lead',
          email: 'above-threshold@example.com',
          lead_score: 60,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 50 })
        .expect(200);

      assert.equal(scoreRes.body.rule_result.triggered, false);
      
      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 0);
    });

    it('does not trigger when score increases within low range', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Low Range Lead',
          email: 'low-range@example.com',
          lead_score: 30,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 38 })
        .expect(200);

      assert.equal(scoreRes.body.rule_result.triggered, false);
      
      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 0);
    });
  });

  describe('Rule isolation - REQ-SALES-001 and REQ-SALES-005 do not interfere', () => {
    it('both rules can trigger independently on different leads', async () => {
      const highLead = await request(app)
        .post('/api/leads')
        .send({
          name: 'High Score Lead',
          email: 'high@example.com',
          lead_score: 79,
        })
        .expect(201);

      const lowLead = await request(app)
        .post('/api/leads')
        .send({
          name: 'Low Score Lead',
          email: 'low@example.com',
          lead_score: 50,
        })
        .expect(201);

      const highScoreRes = await request(app)
        .patch(`/api/leads/${highLead.body.lead.id}/score`)
        .send({ lead_score: 85 })
        .expect(200);

      assert.equal(highScoreRes.body.rule_result.triggered, true);
      assert.equal(highScoreRes.body.rule_result.tasks[0].assigned_role, 'Sales Manager');

      const lowScoreRes = await request(app)
        .patch(`/api/leads/${lowLead.body.lead.id}/score`)
        .send({ lead_score: 35 })
        .expect(200);

      assert.equal(lowScoreRes.body.rule_result.triggered, true);
      assert.equal(lowScoreRes.body.rule_result.tasks[0].assigned_role, 'Product Manager');

      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 2);
    });
  });
});
