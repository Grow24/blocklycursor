/**
 * PBMP Cursor Token Governance (Ops)
 * Source: Cursor Integration / GAP-CURSOR-TOKEN-001
 *
 * Loads PBMP-side controls from environment. Cursor executes whatever the backend sends;
 * these limits are enforced by PBMP before the Cloud Agents API call.
 */

function envString(key, fallback = '') {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : String(v);
}

function envBool(key, fallback = false) {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function envNumber(key, fallback) {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function envList(key, fallback = []) {
  const raw = envString(key, '');
  if (!raw) return [...fallback];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getCursorGovernanceConfig() {
  const allowedModels = envList('CURSOR_ALLOWED_MODELS', ['auto', 'composer', 'gpt-5-mini']).map(
    (m) => m.toLowerCase(),
  );
  const defaultModel = envString('CURSOR_MODEL_DEFAULT', 'auto').toLowerCase();

  return {
    apiKey: envString('CURSOR_API_KEY', ''),
    agentsApiUrl: envString('CURSOR_AGENTS_API_URL', 'https://api.cursor.com/v1/agents'),
    repository: envString('CURSOR_REPOSITORY', ''),
    repoRef: envString('CURSOR_REPO_REF', 'main'),
    autoCreatePR: envBool('CURSOR_AUTO_CREATE_PR', false),
    webChatUrl: envString('CURSOR_WEB_CHAT_URL', 'https://www.cursor.com'),

    modelDefault: defaultModel,
    allowedModels: allowedModels.includes(defaultModel)
      ? allowedModels
      : [defaultModel, ...allowedModels],

    maxPromptTokens: envNumber('PBMP_MAX_PROMPT_TOKENS', 8000),
    maxContextTokens: envNumber('PBMP_MAX_CONTEXT_TOKENS', 50000),
    maxTotalInputTokens: envNumber('PBMP_MAX_TOTAL_INPUT_TOKENS', 75000),
    maxExpectedOutputTokens: envNumber('PBMP_MAX_EXPECTED_OUTPUT_TOKENS', 15000),

    maxFilesPerRun: envNumber('PBMP_MAX_FILES_PER_CURSOR_RUN', 20),
    maxFileBytesPerRun: envNumber('PBMP_MAX_FILE_BYTES_PER_RUN', 300000),
    maxRepoScanFiles: envNumber('PBMP_MAX_REPO_SCAN_FILES', 100),

    costEstimateEnabled: envBool('PBMP_COST_ESTIMATE_ENABLED', true),
    costBufferMultiplier: envNumber('PBMP_COST_BUFFER_MULTIPLIER', 2.0),
    costWarningThresholdUsd: envNumber('PBMP_COST_WARNING_THRESHOLD_USD', 0.25),
    costApprovalThresholdUsd: envNumber('PBMP_COST_APPROVAL_THRESHOLD_USD', 0.5),
    hardStopCostUsd: envNumber('PBMP_HARD_STOP_COST_USD', 1.0),

    trialDailyRunLimit: envNumber('PBMP_TRIAL_USER_DAILY_RUN_LIMIT', 3),
    trialMonthlyBudgetUsd: envNumber('PBMP_TRIAL_USER_MONTHLY_BUDGET_USD', 0.5),
    paidMonthlyBudgetUsd: envNumber('PBMP_PAID_USER_MONTHLY_BUDGET_USD', 5.0),
    projectMonthlyBudgetUsd: envNumber('PBMP_PROJECT_MONTHLY_BUDGET_USD', 10.0),

    cursorMonthlyBudgetUsd: envNumber('PBMP_CURSOR_MONTHLY_BUDGET_USD', 20.0),
    cursorOverageAllowed: envBool('PBMP_CURSOR_OVERAGE_ALLOWED', false),

    runsPerUserPerDay: envNumber('PBMP_CURSOR_RUNS_PER_USER_PER_DAY', 5),
    runsPerProjectPerDay: envNumber('PBMP_CURSOR_RUNS_PER_PROJECT_PER_DAY', 20),
    concurrentRunsLimit: envNumber('PBMP_CURSOR_CONCURRENT_RUNS_LIMIT', 2),

    requireCostConfirmation: envBool('PBMP_REQUIRE_COST_CONFIRMATION', true),
    requireAdminApprovalAboveUsd: envNumber('PBMP_REQUIRE_ADMIN_APPROVAL_ABOVE_USD', 0.5),
    requireRepoAllowlist: envBool('PBMP_REQUIRE_REPO_ALLOWLIST', true),
    allowedRepos: envList('PBMP_ALLOWED_REPOS', [
      'Grow24/blocklycursor',
      'Grow24/bpmpcursor',
    ]),

    defaultUserId: envString('PBMP_DEFAULT_CURSOR_USER_ID', 'local-dev-user'),
    defaultUserTier: envString('PBMP_DEFAULT_CURSOR_USER_TIER', 'trial'), // trial | paid | admin
    defaultProjectId: envString('PBMP_DEFAULT_CURSOR_PROJECT_ID', 'pbmp-workbench'),
  };
}
