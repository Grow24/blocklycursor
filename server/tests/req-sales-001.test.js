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
    it('creates Sales Manager follow-up task when score updates from 79 to 81', async () => {
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
      assert.equal(tasksRes.body.tasks[0].assigned_role, 'Sales Manager');
    });
  });
});
