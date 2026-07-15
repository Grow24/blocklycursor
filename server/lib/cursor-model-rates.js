/**
 * PBMP Cursor Token Governance (Ops)
 * Source: Cursor Integration / GAP-CURSOR-TOKEN-001
 *
 * Per-model rates are USD per 1M tokens (input / cache_write / cache_read / output).
 * Used only for PBMP pre-submit estimates — not Cursor's exact bill.
 */

/** @type {Record<string, { input: number, cache_write: number, cache_read: number, output: number, pool: string }>} */
export const MODEL_RATES_PER_1M = {
  auto: { input: 1.25, cache_write: 1.25, cache_read: 0.25, output: 6.0, pool: 'first_party' },
  composer: { input: 0.5, cache_write: 0.5, cache_read: 0.2, output: 2.5, pool: 'first_party' },
  'composer-2.5': { input: 0.5, cache_write: 0.5, cache_read: 0.2, output: 2.5, pool: 'first_party' },
  'gpt-5-mini': { input: 0.25, cache_write: 0.25, cache_read: 0.025, output: 2.0, pool: 'api' },
  'gpt-5': { input: 1.25, cache_write: 1.25, cache_read: 0.125, output: 10.0, pool: 'api' },
  'gpt-5.2': { input: 1.75, cache_write: 1.75, cache_read: 0.175, output: 14.0, pool: 'api' },
  'claude-sonnet-5': { input: 3.0, cache_write: 3.0, cache_read: 0.3, output: 15.0, pool: 'api' },
  'gemini-3-flash': { input: 0.5, cache_write: 0.5, cache_read: 0.05, output: 3.0, pool: 'api' },
  'gemini-3-pro': { input: 2.0, cache_write: 2.0, cache_read: 0.2, output: 12.0, pool: 'api' },
  'grok-4.5': { input: 2.0, cache_write: 2.0, cache_read: 0.5, output: 6.0, pool: 'first_party' },
};

export function normalizeModelId(model) {
  const raw = String(model || 'auto').trim().toLowerCase();
  if (raw === 'composer2.5' || raw === 'composer 2.5') return 'composer-2.5';
  if (raw === 'composer2' || raw === 'composer-2') return 'composer';
  return raw;
}

export function getModelRates(model) {
  const id = normalizeModelId(model);
  return MODEL_RATES_PER_1M[id] || MODEL_RATES_PER_1M.auto;
}

/**
 * @param {number} tokens
 * @param {number} ratePer1M
 */
export function tokensToUsd(tokens, ratePer1M) {
  return ((Number(tokens) || 0) * (Number(ratePer1M) || 0)) / 1_000_000;
}
