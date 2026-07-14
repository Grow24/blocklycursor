/**
 * PBMP Traceability
 * Requirement: REQ-SALES-001
 * Acceptance Criteria: AC-REQ-SALES-001-1
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
  tempDir = mkdtempSync(join(tmpdir(), 'pbmp-lms-test-'));
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

describe('REQ-SALES-001: High-score lead follow-up', () => {
  describe('AC-REQ-SALES-001-1: Create task when lead score exceeds threshold', () => {
    it('does not trigger task creation on lead create without score update', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Create Only Lead',
          email: 'create-only@example.com',
          company: 'Create Only Inc',
          lead_score: 81,
        })
        .expect(201);

      assert.equal(createRes.body.rule_result.triggered, false);

      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 0);
    });

    it('creates follow-up task when score updated from 79 to 81', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Acme Corp Contact',
          email: 'contact@acme.example',
          company: 'Acme Corp',
          lead_score: 79,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      assert.equal(createRes.body.rule_result.triggered, false);

      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 81 })
        .expect(200);

      assert.equal(scoreRes.body.lead.lead_score, 81);
      assert.equal(scoreRes.body.rule_result.triggered, true);
      assert.equal(scoreRes.body.rule_result.tasks.length, 1);
      assert.equal(scoreRes.body.rule_result.tasks[0].title, 'Follow up with customer');
      assert.equal(scoreRes.body.rule_result.tasks[0].assigned_role, 'Sales Manager');

      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 1);
      assert.equal(tasksRes.body.tasks[0].lead_id, leadId);
    });

    it('does not create duplicate task when score stays above threshold', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Repeat Lead',
          email: 'repeat@example.com',
          lead_score: 79,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;
      await request(app).patch(`/api/leads/${leadId}/score`).send({ lead_score: 85 }).expect(200);
      await request(app).patch(`/api/leads/${leadId}/score`).send({ lead_score: 90 }).expect(200);

      const tasksRes = await request(app).get('/api/tasks').expect(200);
      assert.equal(tasksRes.body.tasks.length, 1);
    });

    it('sends notification to Sales Manager when score crosses threshold', async () => {
      const createRes = await request(app)
        .post('/api/leads')
        .send({
          name: 'Notification Lead',
          email: 'notify@example.com',
          lead_score: 79,
        })
        .expect(201);

      const leadId = createRes.body.lead.id;

      const scoreRes = await request(app)
        .patch(`/api/leads/${leadId}/score`)
        .send({ lead_score: 81 })
        .expect(200);

      assert.equal(scoreRes.body.rule_result.triggered, true);
      assert.ok(scoreRes.body.rule_result.notifications.length >= 1);
      assert.equal(
        scoreRes.body.rule_result.notifications[0].message,
        'High-score lead needs follow-up',
      );
      assert.equal(scoreRes.body.rule_result.notifications[0].role, 'Sales Manager');

      const notifyRes = await request(app).get('/api/notifications').expect(200);
      const leadNotifications = notifyRes.body.notifications.filter((n) => n.lead_id === leadId);
      assert.ok(leadNotifications.length >= 1);
      assert.equal(leadNotifications[0].message, 'High-score lead needs follow-up');
    });
  });

  describe('Lead management API', () => {
    it('validates lead input', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({ name: '', email: 'bad-email' })
        .expect(400);
      assert.equal(res.body.code, 'VALIDATION_ERROR');
    });

    it('lists and retrieves leads', async () => {
      await request(app)
        .post('/api/leads')
        .send({ name: 'List Lead', email: 'list@example.com', lead_score: 50 })
        .expect(201);

      const listRes = await request(app).get('/api/leads').expect(200);
      assert.ok(listRes.body.leads.length >= 1);

      const lead = listRes.body.leads[0];
      const getRes = await request(app).get(`/api/leads/${lead.id}`).expect(200);
      assert.equal(getRes.body.id, lead.id);
    });
  });
});
