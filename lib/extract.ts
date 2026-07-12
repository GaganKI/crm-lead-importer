import { GoogleGenAI, FunctionCallingConfigMode } from '@google/genai';
import { SYSTEM_PROMPT, EXTRACT_TOOL } from './prompt';
import type { ParsedResultRow } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-2.5-flash is on Google AI Studio's free tier — no billing required.
// If you hit rate limits on a large CSV, gemini-2.5-flash-lite is an even higher-throughput
// free-tier fallback (swap the constant below).
const MODEL = 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 800;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends one batch of raw CSV rows to Gemini and returns mapped CRM records.
 * Retries with exponential backoff on transient failures (rate limits are the most likely
 * failure mode on the free tier, timeouts, or transient 5xx). If a batch still fails after
 * MAX_RETRIES, every row in it is returned as "skipped" with a clear reason, so one bad batch
 * never silently drops rows from the response.
 */
export async function extractBatch(
  rows: Record<string, string>[],
  batchStartIndex: number
): Promise<ParsedResultRow[]> {
  const payload: Record<string, string | number>[] = rows.map((row, i) => ({
    __row_index: batchStartIndex + i,
    ...row,
  }));

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: `Map these ${payload.length} raw CSV rows to the GrowEasy CRM schema:\n\n${JSON.stringify(payload, null, 2)}`,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          // This is structured extraction, not a reasoning task — thinking mode adds a lot of
          // latency (and cost) for no accuracy benefit here, and was blowing past Vercel's
          // function time limit on larger batches. thinkingBudget: 0 disables it.
          thinkingConfig: { thinkingBudget: 0 },
          tools: [{ functionDeclarations: [EXTRACT_TOOL] }],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.ANY,
              allowedFunctionNames: ['return_crm_records'],
            },
          },
        },
      });

      const call = response.functionCalls?.[0];
      if (!call || !call.args) {
        throw new Error('Model did not return a function call');
      }

      const parsed = call.args as unknown as { results: ParsedResultRow[] };

      if (!Array.isArray(parsed.results)) {
        throw new Error('Malformed function response: results is not an array');
      }

      return normalizeBatchResult(parsed.results, payload.length, batchStartIndex);
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === MAX_RETRIES;
      if (isLastAttempt) break;
      const delay = BASE_DELAY_MS * 2 ** attempt + Math.random() * 250;
      await sleep(delay);
    }
  }

  console.error('Batch failed after retries:', lastError);
  return payload.map(({ __row_index, ...raw }) => ({
    row_index: __row_index as number,
    status: 'skipped' as const,
    reason: 'AI extraction failed for this batch after retries — please re-run or check the row manually.',
    raw: raw as Record<string, string>,
  }));
}

// Guards against a model returning too few/many rows, out-of-order rows, or missing fields,
// so a single malformed response never crashes the request or silently drops a row.
function normalizeBatchResult(
  results: ParsedResultRow[],
  expectedCount: number,
  batchStartIndex: number
): ParsedResultRow[] {
  const byIndex = new Map(results.map((r) => [r.row_index, r]));
  const normalized: ParsedResultRow[] = [];

  for (let i = 0; i < expectedCount; i++) {
    const idx = batchStartIndex + i;
    const found = byIndex.get(idx);
    if (found) {
      normalized.push(found);
    } else {
      normalized.push({
        row_index: idx,
        status: 'skipped',
        reason: 'Model omitted this row from its response.',
      });
    }
  }
  return normalized;
}

// Free-tier Gemini defaults to ~10 requests/minute. 20 rows per batch keeps each individual
// call fast (especially now that thinking is disabled) and gives more frequent progress
// updates on larger CSVs, while staying well under Vercel's function time limit per request.
export const BATCH_SIZE = 20;

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}