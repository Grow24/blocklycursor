/**
 * PBMP Cursor Token Governance (Ops)
 * Source: Cursor Integration / GAP-CURSOR-TOKEN-001
 *
 * Pre-submit token/cost estimation. Shows a range, never an exact Cursor bill.
 * Heuristic: ~1 token ≈ 4 English characters + buffer for agent exploration.
 */

import { createHash } from 'crypto';
import { getCursorGovernanceConfig } from './cursor-config.js';
import { getModelRates, normalizeModelId, tokensToUsd } from './cursor-model-rates.js';

export function estimateTokensFromText(text) {
  const raw = String(text || '');
  const characters = raw.length;
  const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;
  const tokens = Math.max(characters ? 1 : 0, Math.ceil(characters / 4));
  return { characters, words, tokens };
}

/**
 * @param {object} params
 * @param {string} params.promptText - full prompt (chat + payload context)
 * @param {string} [params.model]
 * @param {string[]} [params.selectedFileTexts]
 * @param {number} [params.bufferMultiplier]
 */
export function estimateCursorCost(params = {}) {
  const cfg = getCursorGovernanceConfig();
  const model = normalizeModelId(params.model || cfg.modelDefault);
  const rates = getModelRates(model);
  const buffer =
    Number(params.bufferMultiplier) > 0
      ? Number(params.bufferMultiplier)
      : cfg.costBufferMultiplier;

  const promptParts = estimateTokensFromText(params.promptText || '');
  const fileTexts = Array.isArray(params.selectedFileTexts) ? params.selectedFileTexts : [];
  const fileStats = fileTexts.map((t) => estimateTokensFromText(t));
  const fileTokens = fileStats.reduce((sum, f) => sum + f.tokens, 0);
  const fileBytes = fileTexts.reduce((sum, t) => sum + Buffer.byteLength(String(t || ''), 'utf8'), 0);

  const baseInputTokens = promptParts.tokens + fileTokens;
  // Cloud agents may inspect extra files / retry — buffer expands high estimate.
  const inputLow = baseInputTokens;
  const inputMedium = Math.ceil(baseInputTokens * Math.max(1, buffer));
  const inputHigh = Math.ceil(baseInputTokens * Math.max(2, buffer * 2));

  const outputLow = Math.ceil(baseInputTokens * 0.15);
  const outputMedium = Math.ceil(baseInputTokens * 0.35);
  const outputHigh = Math.min(
    cfg.maxExpectedOutputTokens,
    Math.ceil(baseInputTokens * 0.6) + 2000,
  );

  const costLow =
    tokensToUsd(inputLow, rates.input) + tokensToUsd(outputLow, rates.output);
  const costMedium =
    tokensToUsd(inputMedium, rates.input) + tokensToUsd(outputMedium, rates.output);
  const costHigh =
    tokensToUsd(inputHigh, rates.input) + tokensToUsd(outputHigh, rates.output);

  const promptHash = createHash('sha256')
    .update(String(params.promptText || ''))
    .digest('hex')
    .slice(0, 16);

  return {
    method: 'approx_chars_div_4_with_buffer',
    note:
      'Approximate range only (~4 chars/token + agent buffer). Cursor may use more for repo exploration, tools, retries, and cache tokens.',
    model,
    model_rates_per_1m: rates,
    prompt_hash: promptHash,
    characters: promptParts.characters,
    words: promptParts.words,
    selected_files: fileTexts.length,
    selected_file_bytes: fileBytes,
    selected_file_tokens: fileTokens,

    estimated_input_tokens: baseInputTokens,
    estimated_output_tokens: outputMedium,
    estimated_input_tokens_low: inputLow,
    estimated_input_tokens_medium: inputMedium,
    estimated_input_tokens_high: inputHigh,
    estimated_output_tokens_low: outputLow,
    estimated_output_tokens_medium: outputMedium,
    estimated_output_tokens_high: outputHigh,
    estimated_total_tokens_low: inputLow + outputLow,
    estimated_total_tokens_high: inputHigh + outputHigh,

    estimated_cost_usd_low: roundUsd(costLow),
    estimated_cost_usd_medium: roundUsd(costMedium),
    estimated_cost_usd_high: roundUsd(costHigh),
    estimated_cost_range_label: `$${roundUsd(costLow).toFixed(2)}–$${roundUsd(costHigh).toFixed(2)}`,
    buffer_multiplier: buffer,
  };
}

function roundUsd(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000;
}
