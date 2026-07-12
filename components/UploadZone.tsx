'use client';

import { useCallback, useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  error?: string | null;
}

export default function UploadZone({ onFile, error }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        onFile(file); // let the parser surface a precise error
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  return (
    <div className="w-full">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={`group cursor-pointer rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors ${
          dragging ? 'border-signal bg-signalDim/20' : 'border-border bg-surface hover:border-signal/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface2 text-signal">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 3v12" strokeLinecap="round" />
            <path d="M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="font-display text-lg font-semibold text-ink">
          Drop a CSV here, or click to browse
        </p>
        <p className="mt-2 text-sm text-muted">
          Facebook / Google Ads exports, Excel sheets, CRM dumps, sales reports — any layout works.
        </p>
      </div>
      {error && (
        <p className="mt-3 rounded-lg border border-rose/30 bg-rose/10 px-4 py-2 text-sm text-rose">{error}</p>
      )}
    </div>
  );
}
