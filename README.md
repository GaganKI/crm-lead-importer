# CRM Lead Importer — GrowEasy Assignment

AI-powered CSV importer that maps leads from any CSV layout (Facebook Lead Ads, Google Ads, Excel
sheets, real-estate CRM exports, sales reports, manual spreadsheets) into GrowEasy's fixed CRM schema.

**Applying for:** Software Developer Intern

## Why this approach

Single Next.js app (App Router) instead of a separate Node/Express backend: the API routes run on
the same Node.js runtime the assignment asks for, but it ships as one repo and one Vercel deploy —
no CORS, no second service to keep alive. `app/api/extract/route.ts` is a real batching backend
service; it just happens to live inside Next.js.

## What makes this submission different

- **Confidence scores + skip reasons per row**, not just a raw JSON dump. Every imported row carries
  the model's self-reported mapping confidence; every skipped row carries a plain-English reason.
  Toggle "Show skipped only" in the results view to audit exactly what didn't make it in and why.
- **Streaming batch pipeline.** The extraction API returns newline-delimited JSON — the UI updates
  live per batch (imported/skipped counters, a progress bar) instead of one long spinner.
- **Retry with exponential backoff per batch**, with jitter. If a batch still fails after 3 attempts,
  its rows are surfaced as "skipped: extraction failed" instead of silently vanishing or crashing
  the whole import.
- **Response-shape guarding.** If Claude's tool response omits a row or returns them out of order,
  `normalizeBatchResult` reconciles it against the expected row indices so no row is ever silently
  dropped by a malformed model response.
- **CSV re-export.** Download the successfully mapped rows as a ready-to-import CRM CSV.

## Tech stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- PapaParse (client-side CSV parsing/preview, and CSV export)
- `@google/genai`, using Gemini's forced function calling for structured, schema-valid
  extraction — see `lib/prompt.ts` for the full system prompt and JSON schema. Runs on
  **`gemini-2.5-flash`**, which is on Google AI Studio's free tier (no credit card needed).

## AI extraction design

- `lib/prompt.ts` — the system prompt encodes every rule from the assignment spec (allowed
  `crm_status` / `data_source` enums, date normalization to a JS-`Date`-parsable format, multiple
  email/phone handling, single-CSV-row-safe output, skip-if-no-contact-info) plus a strict
  `parametersJsonSchema` so the model can't return anything except well-typed JSON.
- `lib/extract.ts` — chunks rows into batches of 40, calls Gemini with `functionCallingConfig`
  forced to `ANY` (so it must call the extraction function, never plain text), retries transient
  failures — rate limits are the most likely failure mode on a free-tier key — and normalizes the
  response shape.
- `app/api/extract/route.ts` — receives the raw CSV text (not pre-parsed JSON), parses it
  independently on the server with PapaParse, then streams batch-by-batch progress back to the
  client as extraction completes. The client's Step 2 preview parse and the server's parse are
  fully separate, per the assignment's split between frontend preview and backend parsing.

## Local setup

```bash
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY (free — get one at aistudio.google.com/apikey)
npm run dev
```

Open http://localhost:3000.

## Docker

```bash
docker build -t crm-importer .
docker run -p 3000:3000 --env-file .env.local crm-importer
```

## Deploying (Vercel)

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add an environment variable `GEMINI_API_KEY` in the Vercel project settings.
4. Deploy. No other config needed — API routes run as serverless functions automatically.

## Notes / known limits

- This is a stateless demo: nothing is persisted to a database (optional per the brief). Results
  live only in the browser session; re-uploading re-runs extraction.
- Capped at 5,000 rows per upload in `app/api/extract/route.ts` to keep a single request within
  a reasonable serverless execution window; raise `maxDuration` / add a queue for larger files.
- Model is set to `gemini-2.5-flash` in `lib/extract.ts` — free-tier rate limits are roughly
  10 requests/minute and 1,500/day at time of writing, which is why batches are sized at 40 rows.
  On a very large CSV you may see the retry/backoff kick in more often; that's expected on a free
  key, not a bug. Swap `MODEL` to `gemini-2.5-flash-lite` for higher free-tier throughput, or to
  a paid model if you have billing enabled.
