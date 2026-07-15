/**
 * PBMP Cursor Token Governance (Ops)
 * Source: Cursor Integration / GAP-CURSOR-TOKEN-001
 *
 * Validates user/project/repo/prompt/cost budgets BEFORE calling Cursor API.
 */

import { getCursorGovernanceConfig } from './cursor-config.js';
import { normalizeModelId } from './cursor-model-rates.js';
import { getUsageSnapshot } from './cursor-runs-store.js';

function repoAllowlistKey(repoUrl) {
  const raw = String(repoUrl || '').trim();
  if (!raw) return '';
  try {
    if (raw.startsWith('http')) {
      const u = new URL(raw);
      return u.pathname.replace(/^\//, '').replace(/\.git$/, '');
    }
  } catch {
    // fall through
  }
  return raw.replace(/\.git$/, '').replace(/^https?:\/\/github.com\//i, '');
}

/**
 * @param {object} input
 * @param {object} input.estimate - from estimateCursorCost
 * @param {string} [input.model]
 * @param {string} [input.userId]
 * @param {string} [input.userTier] trial|paid|admin
 * @param {string} [input.projectId]
 * @param {string} [input.repoUrl]
 * @param {boolean} [input.costConfirmed]
 * @param {boolean} [input.adminApproved]
 * @param {number} [input.selectedFileCount]
 * @param {number} [input.selectedFileBytes]
 */
export function evaluateCursorGovernance(input = {}) {
  const cfg = getCursorGovernanceConfig();
  const errors = [];
  const warnings = [];
  const model = normalizeModelId(input.model || cfg.modelDefault);
  const userId = input.userId || cfg.defaultUserId;
  const userTier = String(input.userTier || cfg.defaultUserTier || 'trial').toLowerCase();
  const projectId = input.projectId || cfg.defaultProjectId;
  const estimate = input.estimate || {};
  const costHigh = Number(estimate.estimated_cost_usd_high || 0);
  const costLow = Number(estimate.estimated_cost_usd_low || 0);
  const inputTokens = Number(estimate.estimated_input_tokens || 0);
  const promptTokens = Number(estimate.characters ? Math.ceil(estimate.characters / 4) : inputTokens);
  const outputTokens = Number(estimate.estimated_output_tokens_high || estimate.estimated_output_tokens || 0);

  if (!cfg.allowedModels.map((m) => m.toLowerCase()).includes(model)) {
    errors.push({
      code: 'MODEL_NOT_ALLOWED',
      message: `Model "${model}" is not in CURSOR_ALLOWED_MODELS (${cfg.allowedModels.join(', ')})`,
    });
  }

  if (userTier === 'trial' && !['auto', 'composer', 'composer-2.5'].includes(model)) {
    errors.push({
      code: 'TRIAL_MODEL_RESTRICTED',
      message: 'Trial users may only use Auto / Composer models.',
    });
  }

  const repoUrl = input.repoUrl || cfg.repository;
  if (cfg.requireRepoAllowlist) {
    const key = repoAllowlistKey(repoUrl);
    const allowed = cfg.allowedRepos.map((r) => r.toLowerCase());
    if (!key || !allowed.includes(key.toLowerCase())) {
      errors.push({
        code: 'REPO_NOT_ALLOWED',
        message: `Repository "${key || repoUrl}" is not in PBMP_ALLOWED_REPOS`,
      });
    }
  }

  if (inputTokens > cfg.maxTotalInputTokens) {
    errors.push({
      code: 'TOTAL_INPUT_TOKENS_EXCEEDED',
      message: `Estimated input tokens ${inputTokens} exceed PBMP_MAX_TOTAL_INPUT_TOKENS=${cfg.maxTotalInputTokens}`,
    });
  }
  if (promptTokens > cfg.maxPromptTokens && estimate.characters) {
    // prompt-only soft check when we can separate later; keep as warning if total is ok
    if (inputTokens <= cfg.maxTotalInputTokens) {
      warnings.push({
        code: 'PROMPT_TOKENS_HIGH',
        message: `Prompt alone is ~${promptTokens} tokens (limit PBMP_MAX_PROMPT_TOKENS=${cfg.maxPromptTokens}). Consider shortening.`,
      });
    }
  }
  if (inputTokens > cfg.maxContextTokens) {
    warnings.push({
      code: 'CONTEXT_TOKENS_HIGH',
      message: `Estimated input ${inputTokens} exceeds PBMP_MAX_CONTEXT_TOKENS=${cfg.maxContextTokens}`,
    });
  }
  if (outputTokens > cfg.maxExpectedOutputTokens) {
    warnings.push({
      code: 'OUTPUT_TOKENS_HIGH',
      message: `Expected output high ${outputTokens} exceeds PBMP_MAX_EXPECTED_OUTPUT_TOKENS=${cfg.maxExpectedOutputTokens}`,
    });
  }

  const fileCount = Number(input.selectedFileCount || estimate.selected_files || 0);
  const fileBytes = Number(input.selectedFileBytes || estimate.selected_file_bytes || 0);
  if (fileCount > cfg.maxFilesPerRun) {
    errors.push({
      code: 'TOO_MANY_FILES',
      message: `Selected files ${fileCount} exceed PBMP_MAX_FILES_PER_CURSOR_RUN=${cfg.maxFilesPerRun}`,
    });
  }
  if (fileBytes > cfg.maxFileBytesPerRun) {
    errors.push({
      code: 'FILE_BYTES_EXCEEDED',
      message: `Selected file bytes ${fileBytes} exceed PBMP_MAX_FILE_BYTES_PER_RUN=${cfg.maxFileBytesPerRun}`,
    });
  }

  if (costHigh >= cfg.hardStopCostUsd) {
    errors.push({
      code: 'HARD_STOP_COST',
      message: `Estimated cost high $${costHigh.toFixed(2)} meets/exceeds PBMP_HARD_STOP_COST_USD=$${cfg.hardStopCostUsd.toFixed(2)}. Reduce scope or model.`,
    });
  } else if (costHigh >= cfg.costWarningThresholdUsd) {
    warnings.push({
      code: 'COST_WARNING',
      message: `Cursor usage estimate $${costLow.toFixed(2)}–$${costHigh.toFixed(2)} is near/above warning threshold $${cfg.costWarningThresholdUsd.toFixed(2)}.`,
    });
  }

  const needsAdmin =
    costHigh >= cfg.requireAdminApprovalAboveUsd || costHigh >= cfg.costApprovalThresholdUsd;
  if (needsAdmin && !input.adminApproved && userTier !== 'admin') {
    errors.push({
      code: 'ADMIN_APPROVAL_REQUIRED',
      message: `Estimated cost up to $${costHigh.toFixed(2)} requires admin approval (threshold $${cfg.requireAdminApprovalAboveUsd.toFixed(2)}).`,
    });
  }

  if (cfg.requireCostConfirmation && !input.costConfirmed) {
    errors.push({
      code: 'COST_CONFIRMATION_REQUIRED',
      message: 'Cost confirmation required before calling Cursor API.',
    });
  }

  const usage = getUsageSnapshot({ userId, projectId });
  const userMonthlyBudget =
    userTier === 'admin'
      ? cfg.cursorMonthlyBudgetUsd
      : userTier === 'paid'
        ? cfg.paidMonthlyBudgetUsd
        : cfg.trialMonthlyBudgetUsd;

  if (userTier === 'trial' && usage.user_runs_today >= cfg.trialDailyRunLimit) {
    errors.push({
      code: 'TRIAL_DAILY_RUN_LIMIT',
      message: `Trial daily Cursor run limit reached (${cfg.trialDailyRunLimit}).`,
    });
  }
  if (usage.user_runs_today >= cfg.runsPerUserPerDay) {
    errors.push({
      code: 'USER_DAILY_RUN_LIMIT',
      message: `User daily Cursor run limit reached (${cfg.runsPerUserPerDay}).`,
    });
  }
  if (usage.project_runs_today >= cfg.runsPerProjectPerDay) {
    errors.push({
      code: 'PROJECT_DAILY_RUN_LIMIT',
      message: `Project daily Cursor run limit reached (${cfg.runsPerProjectPerDay}).`,
    });
  }
  if (usage.concurrent_active >= cfg.concurrentRunsLimit) {
    errors.push({
      code: 'CONCURRENT_RUNS_LIMIT',
      message: `Too many concurrent Cursor runs (limit ${cfg.concurrentRunsLimit}).`,
    });
  }

  if (usage.user_cost_month + costHigh > userMonthlyBudget) {
    errors.push({
      code: 'USER_MONTHLY_BUDGET',
      message:
        userTier === 'trial'
          ? 'Your free AI coding credits are used up. Please upgrade or request more credits.'
          : `User monthly Cursor budget exceeded ($${userMonthlyBudget.toFixed(2)}).`,
    });
  }
  if (usage.project_cost_month + costHigh > cfg.projectMonthlyBudgetUsd) {
    errors.push({
      code: 'PROJECT_MONTHLY_BUDGET',
      message: `Project monthly Cursor budget exceeded ($${cfg.projectMonthlyBudgetUsd.toFixed(2)}).`,
    });
  }

  const projectedGlobal = usage.global_cost_month + costHigh;
  if (projectedGlobal > cfg.cursorMonthlyBudgetUsd) {
    if (!cfg.cursorOverageAllowed) {
      errors.push({
        code: 'GLOBAL_CURSOR_BUDGET',
        message:
          'Cursor monthly usage limit reached. Please wait for reset, enable usage-based billing, or upgrade plan.',
      });
    } else {
      warnings.push({
        code: 'OVERAGE_WARNING',
        message:
          'This run may create additional Cursor usage charges. Admin approval required.',
      });
      if (!input.adminApproved) {
        errors.push({
          code: 'OVERAGE_ADMIN_REQUIRED',
          message: 'Overage is enabled but admin approval is required for this run.',
        });
      }
    }
  } else if (usage.global_cost_month / cfg.cursorMonthlyBudgetUsd >= 0.8) {
    warnings.push({
      code: 'GLOBAL_USAGE_NEAR_LIMIT',
      message:
        'Cursor usage is near monthly limit. New agent runs may be restricted.',
    });
  }

  return {
    ok: errors.length === 0,
    allowed: errors.length === 0,
    model,
    user_id: userId,
    user_tier: userTier,
    project_id: projectId,
    errors,
    warnings,
    usage,
    budgets: {
      user_monthly_usd: userMonthlyBudget,
      project_monthly_usd: cfg.projectMonthlyBudgetUsd,
      global_monthly_usd: cfg.cursorMonthlyBudgetUsd,
      overage_allowed: cfg.cursorOverageAllowed,
      hard_stop_usd: cfg.hardStopCostUsd,
      warning_usd: cfg.costWarningThresholdUsd,
      approval_usd: cfg.requireAdminApprovalAboveUsd,
    },
    estimate_summary: {
      cost_low: costLow,
      cost_high: costHigh,
      range_label: estimate.estimated_cost_range_label || `$${costLow.toFixed(2)}–$${costHigh.toFixed(2)}`,
      input_tokens: inputTokens,
    },
  };
}
