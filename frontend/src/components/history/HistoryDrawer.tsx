import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Button } from "../ui/Button";
import type { ImportRun } from "../../services/historyApi";
import { cn } from "../../lib/cn";

interface HistoryDrawerProps {
  run: ImportRun | null;
  open: boolean;
  onClose: () => void;
  initialSection?: "issues" | null;
}

function statusIcon(status: string) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />;
  if (status === "processing") return <Clock3 className="h-4 w-4 text-blue-500" aria-hidden="true" />;
  return <AlertCircle className="h-4 w-4 text-muted" aria-hidden="true" />;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "N/A";
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes} min ${remainingSeconds} sec`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}

export function HistoryDrawer({ run, open, onClose, initialSection = null }: HistoryDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !run || initialSection !== "issues") return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById("history-drawer-issues");
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      (target as HTMLElement).focus();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [initialSection, open, run]);

  if (!open || !run) return null;

  // 🔥 Vérification de sécurité pour run.files
  const filesList = run.files ? Object.values(run.files).filter((f): f is string => f !== null && f !== undefined) : [];
  
  const totalRows = run.cleaning_stats?.rows_read || 0;
  const rowsAfterClean = run.cleaning_stats?.rows_after_clean || 0;
  const duplicatesRemoved = run.cleaning_stats?.duplicates_removed || 0;
  const nullValuesFound = run.cleaning_stats?.total_null_count || 0;
  const importedRows = run.import_stats?.imported_rows || 0;
  const errors = run.import_stats?.error_count || 0;
  const warnings = run.import_stats?.warning_count || 0;

  // Timeline steps basées sur les données réelles
  const timeline = [
    { name: "Upload", status: "completed", time: run.import_date },
    { name: "Cleaning", status: totalRows > 0 ? "completed" : "pending", time: run.import_date },
    { name: "Validation", status: importedRows > 0 ? "completed" : "pending", time: run.completed_at || run.import_date },
    { name: "Import", status: run.status === "completed" ? "completed" : run.status === "processing" ? "in_progress" : "pending", time: run.completed_at },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close import details drawer"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface p-4 shadow-panel">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Import run {run.batch_name || run.id}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:border-primary/35 hover:text-text"
          >
            Close
          </button>
        </div>

        {/* Timeline */}
        <div className="mt-4 space-y-2 rounded-xl border border-border bg-bg/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Timeline</p>
          {timeline.map((step) => (
            <div key={step.name} className="flex items-center gap-2 text-sm">
              {statusIcon(step.status)}
              <span className="text-text">{step.name}</span>
              <span className="ml-auto text-xs text-muted">
                {step.time ? new Date(step.time).toLocaleTimeString() : "pending"}
              </span>
            </div>
          ))}
        </div>

        {/* Files */}
        <div className="mt-3 rounded-xl border border-border bg-bg/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Files</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filesList.length > 0 ? (
              filesList.map((file) => (
                <span key={file} className="inline-flex rounded-full border border-border bg-bg/70 px-2 py-0.5 text-xs text-muted">
                  {file}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">No files information</span>
            )}
          </div>
        </div>

        {/* Cleaning Summary */}
        <div className="mt-3 rounded-xl border border-border bg-bg/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cleaning Summary</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/70 bg-surface/50 p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Rows Read</p>
              <p className="mt-1 text-xl font-semibold text-text">{totalRows.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface/50 p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Rows After Clean</p>
              <p className="mt-1 text-xl font-semibold text-text">{rowsAfterClean.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Duplicates Removed</p>
              <p className="mt-1 text-xl font-semibold text-amber-600 dark:text-amber-300">{duplicatesRemoved.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-rose-500/15 bg-rose-500/5 p-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Null Values Found</p>
              <p className="mt-1 text-xl font-semibold text-rose-600 dark:text-rose-300">{nullValuesFound.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Import Summary */}
        <div className="mt-3 rounded-xl border border-border bg-bg/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Import Summary</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted">Rows imported</p>
              <p className="text-sm font-medium text-text">{importedRows.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Duration</p>
              <p className="text-sm font-medium text-text">{formatDuration(run.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-xs text-rose-500">Errors</p>
              <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{errors}</p>
            </div>
            <div>
              <p className="text-xs text-amber-500">Warnings</p>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-300">{warnings}</p>
            </div>
          </div>
        </div>

        {run.error_details && (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">Error Details</p>
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-300 break-words">{run.error_details}</p>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button type="button" className="w-auto px-4" onClick={onClose}>
            Close
          </Button>
        </div>
      </aside>
    </div>
  );
}