import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { mockRuns } from "../../data/mockImport";
import { cn } from "../../lib/cn";

type Step = 1 | 2 | 3;
type RequiredFileKey =
  | "leopart_technical_data"
  | "ltf_comp_usage"
  | "ltf_transport_receipts"
  | "matdb_active_prices";

type ApiFileKey = "file_tech" | "file_transport" | "file_project" | "file_prices";

const FILE_KEY_MAPPING: Record<RequiredFileKey, ApiFileKey> = {
  "leopart_technical_data": "file_tech",
  "ltf_transport_receipts": "file_transport",
  "ltf_comp_usage": "file_project",
  "matdb_active_prices": "file_prices",
};

type UploadStatus = "Missing" | "Uploaded" | "Replaced" | "Invalid";
type UploadFile = {
  id: string;
  name: string;
  type: "csv" | "xlsx" | "xlsb";
  size: number;
  date: string;
  slotKey: RequiredFileKey;
  apiKey: ApiFileKey;
};
type SlotUploadState = {
  file: UploadFile | null;
  revision: number;
  invalidReason: string | null;
  filenameHint: string | null;
};
type ImportPhase = "Queued" | "Parsing" | "Validating" | "Importing" | "Done" | "Failed";
type CleaningSummary = {
  rows_read: number;
  rows_after_clean: number;
  duplicates_removed: number;
  total_null_count: number;
};

type PollingResponse = {
  status: ImportPhase;
  progress: number;
  total_rows?: number;
  processed_rows?: number;
  errors?: number;
  warnings?: number;
  message?: string;
  error?: string;
};

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Cleaning" },
  { id: 3, label: "Import" },
];

const REQUIRED_FILES: Array<{ 
  key: RequiredFileKey; 
  apiKey: ApiFileKey;
  label: string; 
  expectedPattern: RegExp;
  description: string;
}> = [
  {
    key: "leopart_technical_data",
    apiKey: "file_tech",
    label: "LEOpart technical data",
    expectedPattern: /^\d{8}_LEOparts? report tech data\.(csv|xlsx|xlsb)$/i,
    description: "Format: date_LEOparts report tech data.csv/.xlsx/.xlsb"
  },
  {
    key: "ltf_transport_receipts",
    apiKey: "file_transport",
    label: "LTF Transport Receipts",
    expectedPattern: /^LTF Q\d{1,2} \d{2}\.\d{4} based on Transport Receipts\.(csv|xlsx|xlsb)$/i,
    description: "Format: LTF Q1 03.2026 based on Transport Receipts.csv/.xlsx/.xlsb"
  },
  {
    key: "ltf_comp_usage",
    apiKey: "file_project",
    label: "LTF Comp Usage",
    expectedPattern: /^LTF Q\d{1,2} \d{2}\.\d{4} based on comp usage\.(csv|xlsx|xlsb)$/i,
    description: "Format: LTF Q1 03.2026 based on comp usage.csv/.xlsx/.xlsb"
  },
  {
    key: "matdb_active_prices",
    apiKey: "file_prices",
    label: "MatDB Active Prices",
    expectedPattern: /^MatDB_Full_PIR_extract_\d{8}_active_prices\.(csv|xlsx|xlsb)$/i,
    description: "Format: MatDB_Full_PIR_extract_YYYYMMDD_active_prices.csv/.xlsx/.xlsb"
  },
];

function createInitialSlotState(): Record<RequiredFileKey, SlotUploadState> {
  return REQUIRED_FILES.reduce(
    (accumulator, slot) => {
      accumulator[slot.key] = { file: null, revision: 0, invalidReason: null, filenameHint: null };
      return accumulator;
    },
    {} as Record<RequiredFileKey, SlotUploadState>
  );
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFilename(filename: string, expectedPattern: RegExp): { isValid: boolean; errorMessage: string | null } {
  if (expectedPattern.test(filename)) {
    return { isValid: true, errorMessage: null };
  }
  
  return { 
    isValid: false, 
    errorMessage: "Invalid filename. Please use the correct format." 
  };
}

function getFileType(name: string): "csv" | "xlsx" | "xlsb" {
  if (name.toLowerCase().endsWith(".xlsb")) return "xlsb";
  if (name.toLowerCase().endsWith(".xlsx")) return "xlsx";
  return "csv";
}

function getSlotStatus(state: SlotUploadState): UploadStatus {
  if (!state.file && state.invalidReason) return "Invalid";
  if (!state.file) return "Missing";
  return state.revision > 1 ? "Replaced" : "Uploaded";
}

// ========== APPELS API RÉELS ==========

async function callCleanAPI(
  originalFiles: Record<RequiredFileKey, File | null>,
  batchName: string
): Promise<{ success: boolean; stats?: CleaningSummary; error?: string }> {
  const formData = new FormData();
  
  REQUIRED_FILES.forEach(({ key, apiKey }) => {
    const file = originalFiles[key];
    if (file) {
      formData.append(apiKey, file);
    }
  });
  formData.append("batch_name", batchName);
  
  try {
    const response = await fetch("/api/upload/clean/", {
      method: "POST",
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || "Cleaning failed" };
    }
    
    return { success: true, stats: data.stats };
  } catch (error) {
    console.error("Clean API error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Network error" };
  }
}

async function callStartImportAPI(): Promise<{ task_id: string }> {
  const response = await fetch("/api/upload/import/start/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to start import");
  }
  
  return response.json();
}

async function callImportStatusAPI(taskId: string): Promise<PollingResponse> {
  const response = await fetch(`/api/upload/import/status/${taskId}/`);
  
  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }
  
  return response.json();
}

// ========== COMPOSANT PRINCIPAL ==========

export default function ImportDataPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [slotUploads, setSlotUploads] = useState<Record<RequiredFileKey, SlotUploadState>>(() => createInitialSlotState());
  
  // Stockage des vrais fichiers pour l'API
  const [originalFiles, setOriginalFiles] = useState<Record<RequiredFileKey, File | null>>({
    "leopart_technical_data": null,
    "ltf_transport_receipts": null,
    "ltf_comp_usage": null,
    "matdb_active_prices": null,
  });
  
  // États pour le nettoyage
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningStats, setCleaningStats] = useState<CleaningSummary | null>(null);
  
  // États pour l'import
  const [phase, setPhase] = useState<ImportPhase>("Queued");
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [importStats, setImportStats] = useState({
    imported: 0,
    ignored: 0,
    errors: 0,
  });
  
  const [activeSlot, setActiveSlot] = useState<RequiredFileKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const allRequiredFilesUploaded = REQUIRED_FILES.every((slot) => slotUploads[slot.key].file !== null);
  
  // Nettoyer le polling au démontage
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);
  
  // Fonction de polling
  const startPolling = (id: string) => {
    if (pollingInterval) clearInterval(pollingInterval);
    
    const interval = setInterval(async () => {
      try {
        const status = await callImportStatusAPI(id);
        
        setPhase(status.status);
        setPhaseProgress(status.progress);
        
        setImportStats({
          imported: status.processed_rows || 0,
          ignored: status.warnings || 0,
          errors: status.errors || 0,
        });
        
        // Arrêter le polling quand l'import est terminé
        if (status.status === "Done" || status.status === "Failed") {
          clearInterval(interval);
          setIsImporting(false);
          setPollingInterval(null);
          
          if (status.status === "Failed") {
            console.error("Import failed:", status.error);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(interval);
        setIsImporting(false);
        setPollingInterval(null);
      }
    }, 2000);
    
    setPollingInterval(interval);
  };
  
  // Démarrer l'import après nettoyage
  const handleStartImport = async () => {
    setIsImporting(true);
    setPhase("Queued");
    setPhaseProgress(0);
    
    try {
      const result = await callStartImportAPI();
      setTaskId(result.task_id);
      startPolling(result.task_id);
    } catch (error) {
      console.error("Failed to start import:", error);
      setIsImporting(false);
      setPhase("Queued");
      setPhaseProgress(0);
    }
  };
  
  // Lancer le nettoyage puis l'import
  const handleCleanAndImport = async () => {
    setIsCleaning(true);
    
    try {
      const batchName = `Import_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
      const result = await callCleanAPI(originalFiles, batchName);
      
      if (result.success && result.stats) {
        setCleaningStats(result.stats);
        // Passer à l'étape 3 et démarrer l'import
        setStep(3);
        await handleStartImport();
      } else {
        console.error("Cleaning failed:", result.error);
        alert(`Cleaning failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Cleaning error:", error);
      alert("Cleaning failed. Check console for details.");
    } finally {
      setIsCleaning(false);
    }
  };
  
  // Gestion des fichiers
  const handleSlotFile = (slotKey: RequiredFileKey, incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const selected = incoming[0];
    
    const slotConfig = REQUIRED_FILES.find(s => s.key === slotKey);
    
    const validation = slotConfig 
      ? validateFilename(selected.name, slotConfig.expectedPattern)
      : { isValid: true, errorMessage: null };
    
    if (!validation.isValid) {
      setSlotUploads((current) => ({
        ...current,
        [slotKey]: {
          ...current[slotKey],
          invalidReason: validation.errorMessage,
          filenameHint: `Expected format: ${slotConfig?.description}`,
          file: null,
          revision: current[slotKey].revision,
        },
      }));
      return;
    }
    
    const isAccepted = selected.name.toLowerCase().endsWith(".csv") ||
      selected.name.toLowerCase().endsWith(".xlsx") ||
      selected.name.toLowerCase().endsWith(".xlsb");
    const date = new Date().toLocaleString("en-US");

    if (!isAccepted) {
      setSlotUploads((current) => ({
        ...current,
        [slotKey]: {
          ...current[slotKey],
          invalidReason: "Unsupported file type. Use CSV, XLSX, or XLSB.",
          file: null,
        },
      }));
      return;
    }

    // Stocker le vrai File object pour l'API
    setOriginalFiles(prev => ({
      ...prev,
      [slotKey]: selected
    }));

    setSlotUploads((current) => {
      const previous = current[slotKey];
      return {
        ...current,
        [slotKey]: {
          file: {
            id: `${selected.name}-${Date.now()}`,
            name: selected.name,
            type: getFileType(selected.name),
            size: selected.size,
            date,
            slotKey,
            apiKey: slotConfig?.apiKey || FILE_KEY_MAPPING[slotKey],
          },
          revision: previous.revision + 1,
          invalidReason: null,
          filenameHint: null,
        },
      };
    });
  };
  
  const openFilePicker = (slotKey: RequiredFileKey) => {
    setActiveSlot(slotKey);
    fileInputRef.current?.click();
  };
  
  const removeSlotFile = (slotKey: RequiredFileKey) => {
    setSlotUploads((current) => ({
      ...current,
      [slotKey]: { file: null, revision: 0, invalidReason: null, filenameHint: null },
    }));
    setOriginalFiles(prev => ({
      ...prev,
      [slotKey]: null
    }));
  };
  
  const goToDashboard = () => {
    navigate("/app/dashboard");
  };
  
  const goToHistory = () => {
    navigate("/app/history");
  };
  
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3.5">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-premium sm:p-5">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Import Data</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted">
            Upload the 4 required LEONI business files, review cleaning summary, and run the import workflow.
          </p>
        </div>

        <ol className="mt-4 grid grid-cols-3 gap-2">
          {STEPS.map((item) => {
            const isDisabled = item.id === 2 && !allRequiredFilesUploaded;
            return (
              <li key={item.id} className="list-none">
                <button
                  type="button"
                  onClick={() => {
                    if (!isDisabled) setStep(item.id);
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    step === item.id
                      ? "border-primary/35 bg-primary/10 text-text"
                      : "border-border bg-bg/50 text-muted hover:border-primary/25"
                  )}
                >
                  <p className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", step === item.id ? "text-primary" : "text-muted")}>
                    Step {item.id}
                  </p>
                  <p className="mt-1 text-sm font-medium">{item.label}</p>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xlsb"
        className="hidden"
        onChange={(event) => {
          if (activeSlot) handleSlotFile(activeSlot, event.target.files);
          event.currentTarget.value = "";
        }}
      />

      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Step 1: Upload</h2>
            <p className="text-sm text-muted">Upload all 4 required business files before cleaning can start.</p>
          </div>

          <div className="mt-4 grid gap-3">
            {REQUIRED_FILES.map((slot) => {
              const state = slotUploads[slot.key];
              const status = getSlotStatus(state);
              const file = state.file;
              return (
                <div key={slot.key} className="rounded-xl border border-border bg-bg/35 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Required file</p>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            status === "Uploaded"
                              ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
                              : status === "Replaced"
                                ? "border-primary/25 bg-primary/8 text-primary"
                                : status === "Invalid"
                                  ? "border-rose-500/25 bg-rose-500/8 text-rose-700 dark:text-rose-300"
                                  : "border-border bg-surface text-muted"
                          )}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-text">{slot.label}</p>
                      <p className="text-xs text-muted">{slot.description}</p>
                      <p className="truncate text-sm text-muted">{file?.name ?? "No file uploaded yet."}</p>
                      <div className="grid gap-2 text-xs text-muted sm:grid-cols-3">
                        <p>Size: {file ? formatBytes(file.size) : "-"}</p>
                        <p>Date: {file?.date ?? "-"}</p>
                        <p>Format: {file?.type?.toUpperCase() ?? "-"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => openFilePicker(slot.key)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:border-primary/35 hover:text-primary"
                      >
                        {file ? "Replace" : "Upload"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlotFile(slot.key)}
                        disabled={!file && !state.invalidReason}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:border-primary/35 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {status === "Invalid" && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-rose-600 dark:text-rose-300">{state.invalidReason}</p>
                      {state.filenameHint && (
                        <p className="text-xs text-muted">{state.filenameHint}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <Button 
              type="button" 
              className="w-auto px-4" 
              onClick={handleCleanAndImport}
              disabled={!allRequiredFilesUploaded || isCleaning}
            >
              {isCleaning ? "Cleaning in progress..." : "Clean & Import"}
            </Button>
          </div>
        </section>
      )}

      {/* STEP 2: CLEANING - SKIPPED (direct passage à l'import) */}
      
      {/* STEP 3: IMPORT */}
      {step === 3 && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Step 3: Import</h2>
            <p className="text-sm text-muted">Current state: {phase}</p>
          </div>

          {/* Cleaning stats summary */}
          {cleaningStats && (
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-border bg-bg/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Rows Read</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-text">{cleaningStats.rows_read.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-border bg-bg/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Rows After Clean</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-text">{cleaningStats.rows_after_clean.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Duplicates Removed</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-amber-600 dark:text-amber-300">{cleaningStats.duplicates_removed.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Null Values Found</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-rose-600 dark:text-rose-300">{cleaningStats.total_null_count.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Import progress bar */}
          <div className="mt-4 rounded-xl border border-border bg-bg/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Import progress</p>
              <p className="text-sm font-medium text-text">{phaseProgress}% complete</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-bg">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${phaseProgress}%` }} />
            </div>
          </div>

          {/* Import details */}
          <div className="mt-4 rounded-xl border border-border bg-bg/35 p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Current phase:</span>
                <span className="font-medium text-text">{phase}</span>
              </div>
              {taskId && (
                <div className="flex justify-between">
                  <span className="text-muted">Task ID:</span>
                  <span className="font-mono text-xs text-muted">{taskId}</span>
                </div>
              )}
              {phaseProgress > 0 && phaseProgress < 100 && phase !== "Done" && phase !== "Failed" && (
                <div className="mt-2 text-center text-xs text-muted">
                  Polling in progress...
                </div>
              )}
            </div>
          </div>

          {/* Import stats */}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-bg/35 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Imported</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-text">{importStats.imported.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg/35 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Ignored / Warnings</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-amber-600 dark:text-amber-300">{importStats.ignored.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Errors</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-rose-600 dark:text-rose-300">{importStats.errors.toLocaleString()}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button 
              type="button" 
              className="w-auto px-4" 
              onClick={goToDashboard}
              disabled={phase !== "Done"}
            >
              Go to Dashboard
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              className="w-auto px-4" 
              onClick={goToHistory}
              disabled={phase !== "Done"}
            >
              View in History
            </Button>
          </div>
        </section>
      )}

      {/* Recent imports table */}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-semibold">Recent imports</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-bg/35">
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.18em] text-muted">
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Rows</th>
                <th className="px-3 py-3 font-medium">Errors</th>
              </tr>
            </thead>
            <tbody>
              {mockRuns.map((run) => (
                <tr key={run.id} className="border-b border-border/70 last:border-b-0">
                  <td className="px-3 py-3 text-muted">{run.date}</td>
                  <td className="px-3 py-3 text-text">{run.status}</td>
                  <td className="px-3 py-3 text-muted">{run.rows.toLocaleString("en-US")}</td>
                  <td className="px-3 py-3 text-muted">{run.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
}