import { NextRequest } from 'next/server';
import Papa from 'papaparse';
import { extractBatch, chunk, BATCH_SIZE } from '@/lib/extract';
import type { ParsedResultRow } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server is missing GEMINI_API_KEY. Set it in your environment and redeploy.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let csv: string;
  try {
    const body = await req.json();
    csv = body.csv;
    if (typeof csv !== 'string' || csv.trim().length === 0) throw new Error('empty');
  } catch {
    return new Response(JSON.stringify({ error: 'Request must include a non-empty "csv" string.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Backend parses independently of whatever the client already showed in the preview step —
  // it does not assume fixed column names, and does not trust the client's parse.
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows = parsed.data;
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'No data rows found in that CSV.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (rows.length > 5000) {
    return new Response(
      JSON.stringify({ error: 'This demo caps imports at 5000 rows per upload.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const batches = chunk(rows, BATCH_SIZE);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      const allResults: ParsedResultRow[] = [];
      let imported = 0;
      let skipped = 0;

      for (let b = 0; b < batches.length; b++) {
        const batchStartIndex = b * BATCH_SIZE;
        const batchResults = await extractBatch(batches[b], batchStartIndex);

        for (const r of batchResults) {
          if (r.status === 'imported') imported++;
          else skipped++;
        }
        allResults.push(...batchResults);

        send({
          type: 'progress',
          batchIndex: b + 1,
          totalBatches: batches.length,
          imported,
          skipped,
        });
      }

      send({ type: 'done', results: allResults, imported, skipped, total: rows.length });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
