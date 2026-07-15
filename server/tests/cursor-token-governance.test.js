/**
 * PBMP Traceability
 * Source: Cursor Integration Ops / GAP-CURSOR-TOKEN-001
 * Acceptance Criteria: AC-GAP-CURSOR-TOKEN-001-1 (estimate range + governance block)
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
  tempDir = mkdtempSync(join(tmpdir(), 'pbmp-cursor-test-'));
  process.env.PBMP_LMS_DATA_DIR = join(tempDir, 'lms');
  process.env.PBMP_CURSOR_DATA_DIR = join(tempDir, 'cursor');
  process.env.NODE_ENV = 'test';
  process.env.CURSOR_API_KEY = '';
  process.env.CURSOR_REPOSITORY = 'https://github.com/Grow24/blocklycursor';
  process.env.PBMP_ALLOWED_REPOS = 'Grow24/blocklycursor';
  process.env.PBMP_REQUIRE_REPO_ALLOWLIST = 'true';
  process.env.PBMP_REQUIRE_COST_CONFIRMATION = 'true';
  process.env.PBMP_HARD_STOP_COST_USD = '1.00';
  process.env.PBMP_REQUIRE_ADMIN_APPROVAL_ABOVE_USD = '0.50';
  process.env.PBMP_TRIAL_USER_MONTHLY_BUDGET_USD = '0.50';
  process.env.PBMP_CURSOR_MONTHLY_BUDGET_USD = '20.00';
  process.env.PBMP_CURSOR_OVERAGE_ALLOWED = 'false';
  process.env.CURSOR_ALLOWED_MODELS = 'auto,composer,gpt-5-mini';
  process.env.PBMP_DEFAULT_CURSOR_USER_TIER = 'trial';

  const mod = await import('../index.js');
  app = mod.default;
});

after(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(async () => {
  const { resetCursorRunsStoreForTests } = await import('../lib/cursor-runs-store.js');
  resetCursorRunsStoreForTests();
});

describe('GAP-CURSOR-TOKEN-001: PBMP Cursor token governance', () => {
  describe('AC-GAP-CURSOR-TOKEN-001-1: Estimate returns cost range', () => {
    it('returns approximate token and cost range from backend', async () => {
      const res = await request(app)
        .post('/api/cursor/estimate')
        .send({
          chat_prompt: 'Implement REQ-SALES-001 exactly as approved. Do not invent fields.',
          requirement_id: 'REQ-SALES-001',
          model: 'auto',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);
      assert.ok(res.body.token_estimate);
      assert.ok(res.body.token_estimate.estimated_cost_usd_low >= 0);
      assert.ok(
        res.body.token_estimate.estimated_cost_usd_high
          >= res.body.token_estimate.estimated_cost_usd_low,
      );
      assert.match(res.body.token_estimate.estimated_cost_range_label, /\$/);
    });
  });

  describe('AC-GAP-CURSOR-TOKEN-001-2: Call API requires cost confirmation', () => {
    it('blocks call-api without cost_confirmed', async () => {
      const res = await request(app)
        .post('/api/cursor/call-api')
        .send({
          chat_prompt: 'Implement approved PBMP requirement only.',
          requirement_id: 'REQ-SALES-001',
          cost_confirmed: false,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.ok, false);
      assert.ok(
        (res.body.governance?.errors || []).some((e) => e.code === 'COST_CONFIRMATION_REQUIRED'),
      );
    });
  });

  describe('AC-GAP-CURSOR-TOKEN-001-3: Trial model allowlist', () => {
    it('blocks expensive model for trial tier', async () => {
      const res = await request(app)
        .post('/api/cursor/call-api')
        .set('X-PBMP-User-Tier', 'trial')
        .send({
          chat_prompt: 'Implement approved PBMP requirement only.',
          model: 'claude-sonnet-5',
          cost_confirmed: true,
          admin_approved: true,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.ok, false);
      const codes = (res.body.governance?.errors || []).map((e) => e.code);
      assert.ok(
        codes.includes('TRIAL_MODEL_RESTRICTED') || codes.includes('MODEL_NOT_ALLOWED'),
      );
    });
  });

  describe('AC-GAP-CURSOR-TOKEN-001-4: Usage ledger endpoints', () => {
    it('exposes config and usage endpoints', async () => {
      const cfgRes = await request(app).get('/api/cursor/config');
      assert.equal(cfgRes.status, 200);
      assert.equal(cfgRes.body.ok, true);
      assert.ok(Array.isArray(cfgRes.body.config.allowed_models));

      const usageRes = await request(app).get('/api/cursor/usage');
      assert.equal(usageRes.status, 200);
      assert.equal(usageRes.body.ok, true);
      assert.ok(usageRes.body.usage);
    });
  });
});
