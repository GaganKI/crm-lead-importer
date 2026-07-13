'use client';

import { useMemo, useState } from 'react';
import UploadZone from '@/components/UploadZone';
import DataTable from '@/components/DataTable';
import ProgressPipeline from '@/components/ProgressPipeline';
import { parseCsvFile, recordsToCsv } from '@/lib/csv';
import type { ParsedResultRow, CrmRecord } from '@/lib/types';

type Step = 'upload' | 'preview' | 'processing' | 'results';

const CRM_COLUMNS: { key: keyof CrmRecord; label: string }[] = [
  { key: 'created_at', label: 'created_at' },
  { key: 'name', label: 'name' },
  { key: 'email', label: 'email' },
  { key: 'country_code', label: 'country_code' },
  { key: 'mobile_without_country_code', label: 'mobile' },
  { key: 'company', label: 'company' },
  { key: 'city', label: 'city' },
  { key: 'state', label: 'state' },
  { key: 'country', label: 'country' },
  { key: 'lead_owner', label: 'lead_owner' },
  { key: 'crm_status', label: 'crm_status' },
  { key: 'crm_note', label: 'crm_note' },
  { key: 'data_source', label: 'data_source' },
  { key: 'possession_time', label: 'possession_time' },
  { key: 'description', label: 'description' },
];

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [rawCsvText, setRawCsvText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [progress, setProgress] = useState({ batchIndex: 0, totalBatches: 0, imported: 0, skipped: 0 });
  const [results, setResults] = useState<ParsedResultRow[]>([]);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [showSkippedOnly, setShowSkippedOnly] = useState(false);

  const previewColumns = useMemo(() => headers.map((h) => ({ key: h, label: h, width: '160px' })), [headers]);

  async function handleFile(file: File) {
    setUploadError(null);
    try {
      const { headers, rows, rawText } = await parseCsvFile(file);
      if (rows.length === 0) throw new Error('That CSV has no data rows.');
      setFileName(file.name);
      setHeaders(headers);
      setRawRows(rows);
      setRawCsvText(rawText);
      setStep('preview');
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Could not parse that file as CSV.');
    }
  }

  async function handleConfirm() {
    setStep('processing');
    setResultsError(null);
    setResults([]);
    setProgress({ batchIndex: 0, totalBatches: Math.ceil(rawRows.length / 25), imported: 0, skipped: 0 });

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: rawCsvText }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Extraction request failed.' }));
        throw new Error(err.error ?? 'Extraction request failed.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === 'progress') {
            setProgress({
              batchIndex: event.batchIndex,
              totalBatches: event.totalBatches,
              imported: event.imported,
              skipped: event.skipped,
            });
          } else if (event.type === 'done') {
            setResults(event.results);
            setStep('results');
          }
        }
      }
    } catch (e) {
      setResultsError(e instanceof Error ? e.message : 'Something went wrong during extraction.');
      setStep('results');
    }
  }

  function downloadCsv() {
    const imported = results.filter((r) => r.status === 'imported' && r.record);
    const csv = recordsToCsv(imported.map((r) => r.record as unknown as Record<string, string>));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'growEasy-crm-import.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRawRows([]);
    setRawCsvText('');
    setResults([]);
    setUploadError(null);
    setResultsError(null);
  }

  const importedCount = results.filter((r) => r.status === 'imported').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const visibleResults = showSkippedOnly ? results.filter((r) => r.status === 'skipped') : results;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-signal">GrowEasy</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">CRM Lead Importer</h1>
        </div>
        <StepIndicator step={step} />
      </header>

      {step === 'upload' && (
        <section>
          <p className="mb-6 max-w-xl text-sm text-muted">
            Upload a CSV from any source — Facebook Lead Ads, Google Ads, Excel, a real-estate CRM export,
            a manually built sheet — with whatever column names it happens to have. We'll figure out the mapping.
          </p>
          <UploadZone onFile={handleFile} error={uploadError} />
        </section>
      )}

      {step === 'preview' && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold text-ink">{fileName}</p>
              <p className="text-sm text-muted">
                {rawRows.length} row{rawRows.length === 1 ? '' : 's'} detected · {headers.length} columns · nothing sent to AI yet
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink">
                Choose a different file
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-signal px-5 py-2 text-sm font-semibold text-bg hover:brightness-110"
              >
                Confirm &amp; import
              </button>
            </div>
          </div>
          <DataTable columns={previewColumns} rows={rawRows} />
        </section>
      )}

      {step === 'processing' && (
        <section className="mx-auto max-w-xl py-10">
          <p className="mb-6 text-center text-sm text-muted">
            Mapping {rawRows.length} rows into GrowEasy CRM format…
          </p>
          <ProgressPipeline {...progress} />
        </section>
      )}

      {step === 'results' && (
        <section>
          {resultsError && (
            <p className="mb-4 rounded-lg border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">
              {resultsError}
            </p>
          )}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-6">
              <Stat label="Total rows" value={rawRows.length} />
              <Stat label="Imported" value={importedCount} tone="signal" />
              <Stat label="Skipped" value={skippedCount} tone="amber" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSkippedOnly((v) => !v)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  showSkippedOnly ? 'border-amber text-amber' : 'border-border text-muted hover:text-ink'
                }`}
              >
                {showSkippedOnly ? 'Show all rows' : 'Show skipped only'}
              </button>
              <button onClick={downloadCsv} disabled={importedCount === 0} className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-bg hover:brightness-110 disabled:opacity-40">
                Download CRM CSV
              </button>
              <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-ink">
                Import another file
              </button>
            </div>
          </div>

          <DataTable
            columns={[{ key: '_status', label: 'status', width: '110px' }, ...CRM_COLUMNS, { key: '_note', label: 'reason', width: '260px' }]}
            rows={visibleResults.map((r) => {
              const rawPreview = r.raw
                ? Object.entries(r.raw)
                    .filter(([, v]) => v && v.trim())
                    .slice(0, 4)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('  ·  ')
                : '';
              return {
                _status: r.status,
                _note:
                  r.status === 'skipped'
                    ? [r.reason, rawPreview && `(original row — ${rawPreview})`].filter(Boolean).join('  ')
                    : r.confidence !== undefined
                      ? `confidence ${(r.confidence * 100).toFixed(0)}%`
                      : '',
                ...(r.record ?? {}),
              };
            })}
            maxHeight="560px"
            rowClassName={(row) => (row._status === 'skipped' ? 'opacity-60' : '')}
            renderCell={(col, row) => {
              if (col.key === '_status') {
                const isImported = row._status === 'imported';
                return (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isImported ? 'bg-signalDim text-signal' : 'bg-amber/10 text-amber'
                    }`}
                  >
                    {row._status}
                  </span>
                );
              }
              return row[col.key] ?? '';
            }}
          />
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'signal' | 'amber' }) {
  return (
    <div>
      <p className={`font-display text-2xl font-bold ${tone === 'signal' ? 'text-signal' : tone === 'amber' ? 'text-amber' : 'text-ink'}`}>
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'preview', label: 'Preview' },
    { key: 'processing', label: 'Import' },
    { key: 'results', label: 'Result' },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-2 font-mono text-xs text-muted">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <span className={i <= currentIndex ? 'text-signal' : ''}>{s.label}</span>
          {i < steps.length - 1 && <span className="text-border">/</span>}
        </div>
      ))}
    </div>
  );
}