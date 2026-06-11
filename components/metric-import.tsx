"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";
import {
  STANDARD_FIELD_LABELS,
  type BiMetricImport
} from "@/lib/bi-csv-import";

/**
 * One drag-drop intake for BI exports. Shows what was auto-mapped after import
 * so creators can trust - or correct - the snapshot fields below it.
 */
export function MetricImportDropzone({
  metricImport,
  importing,
  disabled,
  onFiles,
  onClear
}: {
  metricImport: BiMetricImport | null;
  importing: boolean;
  disabled: boolean;
  onFiles: (files: FileList | null) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const busy = disabled || importing;

  if (metricImport) {
    const metricLabel =
      metricImport.sourceFormat === "pdf" || metricImport.sourceFormat === "pptx"
        ? "analysis metric"
        : "workflow metric";
    const periodSummary =
      metricImport.periods.length > 1
        ? `${metricImport.periods[0]} - ${
            metricImport.periods[metricImport.periods.length - 1]
          } (${metricImport.periods.length} periods)`
        : metricImport.periods[0] ?? "1 period";

    return (
      <div className="rounded-md border border-[#D7CABF] bg-[#FCFBFA] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#FFF7F2] text-brand-orange ring-1 ring-[#FFD3BE]">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-brand-charcoal">
                {metricImport.fileName}
              </p>
              <p className="mt-0.5 text-xs font-semibold leading-5 text-[#787E89]">
                {metricImport.clientName || "Client not detected"} |{" "}
                {periodSummary}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#787E89] transition hover:bg-[#F3F3F3] hover:text-brand-charcoal disabled:pointer-events-none disabled:opacity-50"
            onClick={onClear}
            disabled={busy}
            aria-label="Clear imported metrics"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {metricImport.mappedColumns.map(({ header, field }) => (
            <span
              key={header}
              title={`Column "${header}"`}
              className="rounded-sm bg-[#FFF7F2] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-brand-orange ring-1 ring-[#FFD3BE]"
            >
              {STANDARD_FIELD_LABELS[field]}
            </span>
          ))}
          {metricImport.metricColumns.length > 0 ? (
            <span
              title={metricImport.metricColumns
                .map((column) => column.header)
                .join(", ")}
              className="rounded-sm bg-[#F3F3F3] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-brand-ink"
            >
              +{metricImport.metricColumns.length} {metricLabel}
              {metricImport.metricColumns.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {metricImport.warnings.length > 0 ? (
          <ul className="mt-3 space-y-1 border-t border-[#E5E0DB] pt-2">
            {metricImport.warnings.map((warning) => (
              <li
                key={warning}
                className="text-xs font-semibold leading-5 text-[#A05A00]"
              >
                {warning}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-disabled={busy}
      onClick={() => {
        if (!busy) {
          inputRef.current?.click();
        }
      }}
      onKeyDown={(event) => {
        if (!busy && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) {
          setDragActive(true);
        }
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        if (!busy) {
          onFiles(event.dataTransfer.files);
        }
      }}
      className={`flex w-full cursor-pointer items-center justify-center gap-3 rounded-md border-2 border-dashed px-4 py-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
        busy ? "pointer-events-none opacity-50" : ""
      } ${
        dragActive
          ? "border-brand-orange bg-[#FFF7F2] text-brand-charcoal"
          : "border-[#D7CABF] bg-[#FCFBFA] text-[#787E89] hover:border-brand-orange hover:text-brand-charcoal"
      }`}
    >
      <UploadCloud className="h-5 w-5 shrink-0" />
      <span className="text-left">
        {importing ? (
          "Reading metrics export..."
        ) : (
          <>
            <span className="block font-bold text-brand-charcoal">
              Drop a metrics export from your reporting tool
            </span>
            <span className="mt-0.5 block text-xs font-semibold">
              Works with Power BI PDF/PPTX exports when report text is
              selectable, or with CSV/TSV exports from any reporting tool.{" "}
              <a
                href="/api/sample-csv"
                download
                className="font-bold text-brand-orange underline-offset-2 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                Download a sample CSV
              </a>
            </span>
          </>
        )}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,.pdf,.pptx,text/csv,text/tab-separated-values,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
