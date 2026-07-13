'use client';

interface Props {
  batchIndex: number;
  totalBatches: number;
  imported: number;
  skipped: number;
}

export default function ProgressPipeline({ batchIndex, totalBatches, imported, skipped }: Props) {
  const pct = totalBatches > 0 ? Math.round((batchIndex / totalBatches) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {batchIndex === 0 ? 'Starting…' : `Batch ${Math.min(batchIndex, totalBatches)} of ${totalBatches}`}
        </span>
        <span>{batchIndex === 0 ? '' : `${pct}%`}</span>
      </div>

      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-surface2">
        {batchIndex === 0 ? (
          <div className="absolute inset-y-0 w-1/5 rounded-full bg-signal animate-scan" />
        ) : (
          <div
            className="h-full rounded-full bg-signal transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      <div className="relative mt-8 flex items-center justify-between text-xs font-mono text-muted">
        <PipelineNode label="CSV rows" />
        <PipelineTrack />
        <PipelineNode label="Gemini mapping" active />
        <PipelineTrack />
        <PipelineNode label="CRM records" />
      </div>

      <div className="mt-6 flex gap-6 text-sm">
        <span className="text-signal">{imported} imported</span>
        <span className="text-amber">{skipped} skipped</span>
      </div>
    </div>
  );
}

function PipelineNode({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-signal shadow-[0_0_0_4px_rgba(111,227,180,0.15)]' : 'bg-border'}`}
      />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

function PipelineTrack() {
  return (
    <div className="relative mx-2 h-px flex-1 bg-border">
      <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-signal animate-flow" />
    </div>
  );
}