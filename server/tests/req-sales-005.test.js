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
  tempDir = mkdtempSync(join(tmpdir(), 'pbmp-lms-test-sales005-'));
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
  describe('AC-REQ-SALES-005-1: Create task when lead score drops below threshold', () => {
    it('does not trigger task creation on lead create without score update', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Create Only Lead',
          email: 'create-only@example.com',
          company: 'Create Only Inc',
          lead_score: 30,
        })
        .expect(201);

      assert.equal(createRes.body.rule_result.triggered, false);

      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 0);
    });

    it('creates follow-up task when score updated from 40 to 30', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Low Score Lead',
          email: 'lowscore@example.com',
          company: 'Low Score Corp',
          lead_score: 40,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      assert.equal(createRes.body.rule_result.triggered, false);

      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 30 })
        .expect(200);

      assert.equal(scoreRes.body.lead.lead_score, 30);
      assert.equal(scoreRes.body.rule_result.triggered, true);
      assert.ok(scoreRes.body.rule_result.rules_triggered.includes('REQ-SALES-005'));
      assert.equal(scoreRes.body.rule_result.tasks.length, 1);
      assert.equal(scoreRes.body.rule_result.tasks[0].title, 'Follow up with customer');
      assert.equal(scoreRes.body.rule_result.tasks[0].assigned_role, 'Product Manager');

      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 1);
      assert.equal(tasksRes.body.tasks[0].lead_id, leadId);
      assert.equal(tasksRes.body.tasks[0].requirement_id, 'REQ-SALES-005');
    });

    it('sends notification to Product Manager when threshold is crossed', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Notification Test Lead',
          email: 'notify@example.com',
          lead_score: 36,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 35 })
        .expect(200);

      assert.equal(scoreRes.body.rule_result.triggered, true);
      assert.ok(scoreRes.body.rule_result.notifications.length >= 1);
      const notification = scoreRes.body.rule_result.notifications.find(
        (n) => n.role === 'Product Manager',
      );
      assert.ok(notification, 'Notification to Product Manager should exist');
      assert.equal(notification.message, 'High-score lead needs follow-up');
    });

    it('does not create duplicate task when score stays below threshold', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Repeat Low Lead',
          email: 'repeat-low@example.com',
          lead_score: 40,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      await request(app).patch(`/api/leads/${leadId}/score`).send({ lead_score: 30 }).expect(200);
      await request(app).patch(`/api/leads/${leadId}/score`).send({ lead_score: 25 }).expect(200);

      const tasksRes = await request(app).get('/api/tasks').expect(200);
      const sales005Tasks = tasksRes.body.tasks.filter((t) => t.requirement_id === 'REQ-SALES-005');
      assert.equal(sales005Tasks.length, 1);
    });

    it('does not trigger when score goes from below threshold to above', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Increasing Score Lead',
          email: 'increasing@example.com',
          lead_score: 30,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 40 })
        .expect(200);

      assert.equal(scoreRes.body.rule_result.rules_triggered.includes('REQ-SALES-005'), false);
      const tasksRes = await request(app).get('/api/tasks').expect(200);
      const sales005Tasks = tasksRes.body.tasks.filter((t) => t.requirement_id === 'REQ-SALES-005');
      assert.equal(sales005Tasks.length, 0);
    });
  });

  describe('REQ-SALES-001 and REQ-SALES-005 do not interfere', () => {
    it('REQ-SALES-001 triggers at high scores, REQ-SALES-005 does not', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'High Score Lead',
          email: 'highscore@example.com',
          lead_score: 79,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 81 })
        .expect(200);

      assert.ok(scoreRes.body.rule_result.rules_triggered.includes('REQ-SALES-001'));
      assert.equal(scoreRes.body.rule_result.rules_triggered.includes('REQ-SALES-005'), false);
    });

    it('REQ-SALES-005 triggers at low scores, REQ-SALES-001 does not', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Low Score Lead',
          email: 'lowscore2@example.com',
          lead_score: 40,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 30 })
        .expect(200);

      assert.ok(scoreRes.body.rule_result.rules_triggered.includes('REQ-SALES-005'));
      assert.equal(scoreRes.body.rule_result.rules_triggered.includes('REQ-SALES-001'), false);
    });
  });
});
