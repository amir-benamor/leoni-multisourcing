import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";
import { importApi, CleaningSummary, ImportPhase, CleanedFiles } from "../../services/importApi";
import { historyApi, ImportRun } from "../../services/historyApi";

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
  fileObject: File;
};
type SlotUploadState = {
  file: UploadFile | null;
  revision: number;
  invalidReason: string | null;
  filenameHint: string | null;
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

export default function ImportDataPage() {
  const navigate = useNavigate();
  
  const [isRestoring, setIsRestoring] = useState(true);
  
  const [step, setStep] = useState<Step>(1);
  const [slotUploads, setSlotUploads] = useState<Record<RequiredFileKey, SlotUploadState>>(() => createInitialSlotState());
  
  // États pour le nettoyage
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningProgress, setCleaningProgress] = useState(0);
  const [cleaningTaskId, setCleaningTaskId] = useState<string | null>(null);
  const [cleaningStats, setCleaningStats] = useState<CleaningSummary | null>(null);
  const [cleaningPollingInterval, setCleaningPollingInterval] = useState<number | null>(null);
  
  // Stocker les fichiers nettoyés et le batch name après le nettoyage
  const [cleanedFiles, setCleanedFiles] = useState<CleanedFiles | null>(null);
  const [currentBatchName, setCurrentBatchName] = useState<string>('');
  
  // États pour l'import
  const [phase, setPhase] = useState<ImportPhase>("Queued");
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [importPollingInterval, setImportPollingInterval] = useState<number | null>(null);
  const [importStats, setImportStats] = useState({
    imported: 0,
    ignored: 0,
    errors: 0,
  });
  
  // États pour les imports récents
  const [recentImports, setRecentImports] = useState<ImportRun[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  
  const [activeSlot, setActiveSlot] = useState<RequiredFileKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const allRequiredFilesUploaded = REQUIRED_FILES.every((slot) => slotUploads[slot.key].file !== null);
  const isProcessActive = isCleaning || isImporting;
  
  // ========== PERSISTANCE AVEC localStorage ==========
  
  // Effacer tous les états sauvegardés
  const clearSavedStates = () => {
    localStorage.removeItem('current_import');
    localStorage.removeItem('current_cleaning');
    console.log('🗑️ [localStorage] Tous les états effacés');
  };
  
  // Sauvegarder l'état de l'import
  const saveImportState = () => {
    if (!taskId) return;
    
    const stateToSave = {
      type: 'import',
      taskId,
      batchName: currentBatchName,
      status: phase,
      progress: phaseProgress,
      cleaningStats,
      importStats,
      cleanedFiles,
      step: 3,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('current_import', JSON.stringify(stateToSave));
    console.log('💾 [localStorage] État import sauvegardé:', stateToSave);
  };
  
  // Annuler le nettoyage
  const handleCancelCleaning = async () => {
    console.log('❌ [UI] Annulation du nettoyage par l\'utilisateur');
    
    if (cleaningPollingInterval) {
      clearInterval(cleaningPollingInterval);
      setCleaningPollingInterval(null);
    }
    
    if (cleaningTaskId && cleaningTaskId !== 'pending') {
      console.log(`📡 [UI] Envoi de la requête d'annulation pour task ${cleaningTaskId}`);
      const result = await importApi.cancelCleaning(cleaningTaskId);
      if (result.success) {
        console.log('✅ [UI] Nettoyage annulé avec succès sur le serveur');
      } else {
        console.error('❌ [UI] Erreur lors de l\'annulation serveur:', result.error);
      }
    }
    
    clearSavedStates();
    setIsCleaning(false);
    setCleaningTaskId(null);
    setCleaningProgress(0);
    setStep(1);
    setCleaningStats(null);
    setCurrentBatchName('');
    
    console.log('✅ [UI] Annulation terminée, retour à l\'étape 1');
  };
  
  // Sauvegarder l'état de l'import à chaque changement
  useEffect(() => {
    if (taskId && phase !== "Queued" && phase !== "Done" && phase !== "Failed") {
      saveImportState();
    }
  }, [taskId, phase, phaseProgress, cleaningStats, importStats]);
  
  // Charger les imports récents
  useEffect(() => {
    const fetchRecentImports = async () => {
      setLoadingRecent(true);
      try {
        const imports = await historyApi.getImports();
        setRecentImports(imports.slice(0, 5));
      } catch (error) {
        console.error("Erreur lors du chargement des imports récents:", error);
      } finally {
        setLoadingRecent(false);
      }
    };
    
    fetchRecentImports();
  }, []);
  
  // Polling pour l'import
  const startImportPolling = (id: string) => {
    if (importPollingInterval) clearInterval(importPollingInterval);
    
    const interval = setInterval(async () => {
      try {
        const status = await importApi.getImportStatus(id);
        
        setPhase(status.status);
        setPhaseProgress(status.progress);
        
        setImportStats({
          imported: status.processed_rows || 0,
          ignored: status.warnings || 0,
          errors: status.errors || 0,
        });
        
        if (status.status === "Done" || status.status === "Failed") {
          clearInterval(interval);
          setIsImporting(false);
          setImportPollingInterval(null);
          clearSavedStates();
          
          if (status.status === "Failed") {
            console.error("Import failed:", status.error);
          }
        } else {
          saveImportState();
        }
      } catch (error) {
        console.error("Import polling error:", error);
        clearInterval(interval);
        setIsImporting(false);
        setImportPollingInterval(null);
      }
    }, 2000);
    
    setImportPollingInterval(interval);
  };
  
  // Démarrer l'import (modifié pour accepter les stats de nettoyage)
  const handleStartImport = async (filesToImport: CleanedFiles, batchNameToUse: string, cleaningStats?: CleaningSummary) => {
    console.log('🚀 [UI] handleStartImport - Début');
    console.log('📊 [UI] Cleaning stats reçues:', cleaningStats);
    
    setIsImporting(true);
    setPhase("Queued");
    setPhaseProgress(0);
    
    try {
      const result = await importApi.startImport(filesToImport, batchNameToUse, cleaningStats);
      console.log('✅ [UI] Import démarré, task_id:', result.task_id);
      setTaskId(result.task_id);
      startImportPolling(result.task_id);
    } catch (error) {
      console.error("❌ [UI] Failed to start import:", error);
      setIsImporting(false);
      setPhase("Queued");
      setPhaseProgress(0);
    }
  };
  
  // Polling pour le nettoyage (modifié pour passer les stats à l'import)
  const startCleaningPolling = (id: string) => {
    if (cleaningPollingInterval) clearInterval(cleaningPollingInterval);
    
    const interval = setInterval(async () => {
      try {
        const status = await importApi.getCleaningStatus(id);
        console.log(`🧹 [Polling Nettoyage] Status: ${status.status}, Progress: ${status.progress}%`);
        
        setCleaningProgress(status.progress);
        
        const cleaningState = {
          type: 'cleaning',
          taskId: id,
          batchName: currentBatchName,
          cleaningStats: cleaningStats,
          cleaningProgress: status.progress,
          step: 2,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('current_cleaning', JSON.stringify(cleaningState));
        
        if (status.status === "Completed") {
          clearInterval(interval);
          setCleaningPollingInterval(null);
          setIsCleaning(false);
          
          if (status.stats && status.cleaned_files && status.batch_name) {
            console.log('✅ [UI] Nettoyage réussi!');
            console.log('📊 [UI] Stats à envoyer à l\'import:', status.stats);
            
            setCleaningStats(status.stats);
            setCleanedFiles(status.cleaned_files);
            setCurrentBatchName(status.batch_name);
            
            localStorage.removeItem('current_cleaning');
            
            setStep(3);
            // 🔥 PASSER LES STATS À L'IMPORT
            await handleStartImport(status.cleaned_files, status.batch_name, status.stats);
          }
        } else if (status.status === "Failed" || status.status === "Cancelled") {
          clearInterval(interval);
          setCleaningPollingInterval(null);
          setIsCleaning(false);
          if (status.status === "Failed") {
            alert(`Cleaning failed: ${status.error || status.message}`);
          } else {
            console.log('ℹ️ [UI] Nettoyage annulé par l\'utilisateur');
          }
          clearSavedStates();
          setStep(1);
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(interval);
        setCleaningPollingInterval(null);
        setIsCleaning(false);
      }
    }, 2000);
    
    setCleaningPollingInterval(interval);
  };
  
  // Lancer le nettoyage asynchrone
  const handleCleanAndImport = async () => {
    console.log('🎬 [UI] ========== DÉBUT Clean & Import ==========');
    
    clearSavedStates();
    
    setIsCleaning(true);
    setStep(2);
    setCleaningProgress(0);
    
    const batchName = `Import_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    setCurrentBatchName(batchName);
    
    const tempCleaningState = {
      type: 'cleaning',
      taskId: 'pending',
      batchName: batchName,
      cleaningStats: null,
      cleaningProgress: 0,
      step: 2,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('current_cleaning', JSON.stringify(tempCleaningState));
    console.log('💾 [localStorage] État nettoyage temporaire sauvegardé');
    
    try {
      const files = {
        file_tech: slotUploads["leopart_technical_data"]?.file?.fileObject || null,
        file_transport: slotUploads["ltf_transport_receipts"]?.file?.fileObject || null,
        file_project: slotUploads["ltf_comp_usage"]?.file?.fileObject || null,
        file_prices: slotUploads["matdb_active_prices"]?.file?.fileObject || null,
      };
      
      console.log('📁 [UI] Fichiers:', {
        tech: files.file_tech?.name || 'null',
        transport: files.file_transport?.name || 'null',
        project: files.file_project?.name || 'null',
        prices: files.file_prices?.name || 'null',
      });
      
      console.log('🧹 [UI] Appel de importApi.startCleaning()...');
      console.time('⏱️ [UI] Temps de démarrage');
      
      const result = await importApi.startCleaning(files, batchName);
      
      console.timeEnd('⏱️ [UI] Temps de démarrage');
      console.log('🧹 [UI] Réponse reçue:', result);
      
      if (result.success && result.task_id) {
        console.log('✅ [UI] Nettoyage démarré, task_id:', result.task_id);
        setCleaningTaskId(result.task_id);
        
        const updatedCleaningState = {
          type: 'cleaning',
          taskId: result.task_id,
          batchName: batchName,
          cleaningStats: null,
          cleaningProgress: 0,
          step: 2,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('current_cleaning', JSON.stringify(updatedCleaningState));
        console.log('💾 [localStorage] État nettoyage mis à jour avec task_id');
        
        startCleaningPolling(result.task_id);
      } else {
        console.error('❌ [UI] Démarrage nettoyage échoué');
        alert(`Failed to start cleaning: ${result.message || 'Unknown error'}`);
        clearSavedStates();
        setIsCleaning(false);
        setStep(1);
      }
    } catch (error) {
      console.error('❌ [UI] ERREUR lors du démarrage du nettoyage:', error);
      alert("Failed to start cleaning. Check console for details.");
      clearSavedStates();
      setIsCleaning(false);
      setStep(1);
    }
  };
  
  // Nouvel import : réinitialiser tout
  const handleNewImport = () => {
    console.log('🔄 [UI] Nouvel import - Réinitialisation complète');
    if (cleaningPollingInterval) clearInterval(cleaningPollingInterval);
    if (importPollingInterval) clearInterval(importPollingInterval);
    clearSavedStates();
    setStep(1);
    setPhase("Queued");
    setPhaseProgress(0);
    setIsImporting(false);
    setIsCleaning(false);
    setCleaningTaskId(null);
    setCleaningProgress(0);
    setTaskId(null);
    setCleaningStats(null);
    setCleanedFiles(null);
    setCurrentBatchName('');
    setImportStats({ imported: 0, ignored: 0, errors: 0 });
    setSlotUploads(createInitialSlotState());
  };
  
  // Vérifier et reprendre l'état au chargement
  const checkForOngoingProcess = async () => {
    console.log('🔍 [UI] Vérification des processus en cours...');
    
    const savedImport = localStorage.getItem('current_import');
    if (savedImport) {
      try {
        const saved = JSON.parse(savedImport);
        console.log('🔄 [localStorage] Import en cours trouvé:', saved);
        
        setTaskId(saved.taskId);
        setCurrentBatchName(saved.batchName);
        setPhase(saved.status);
        setPhaseProgress(saved.progress);
        setCleaningStats(saved.cleaningStats);
        setImportStats(saved.importStats);
        setCleanedFiles(saved.cleanedFiles);
        setStep(3);
        setIsImporting(true);
        setIsCleaning(false);
        
        const status = await importApi.getImportStatus(saved.taskId);
        
        setPhase(status.status);
        setPhaseProgress(status.progress);
        setImportStats({
          imported: status.processed_rows || 0,
          ignored: status.warnings || 0,
          errors: status.errors || 0,
        });
        
        if (status.status === "Done" || status.status === "Failed") {
          clearSavedStates();
          setIsImporting(false);
        } else {
          startImportPolling(saved.taskId);
        }
        setIsRestoring(false);
        return;
      } catch (e) {
        console.error('Erreur lecture import sauvegardé:', e);
        clearSavedStates();
      }
    }
    
    const savedCleaning = localStorage.getItem('current_cleaning');
    if (savedCleaning) {
      try {
        const saved = JSON.parse(savedCleaning);
        console.log('🔄 [localStorage] Nettoyage en cours trouvé:', saved);
        
        if (saved.taskId && saved.taskId !== 'pending') {
          setCurrentBatchName(saved.batchName);
          setCleaningStats(saved.cleaningStats);
          setCleaningProgress(saved.cleaningProgress || 0);
          setStep(2);
          setIsCleaning(true);
          setIsImporting(false);
          
          startCleaningPolling(saved.taskId);
          console.log('✅ [UI] Nettoyage restauré, étape 2, isCleaning=true');
        } else {
          console.log('⚠️ [UI] Nettoyage en attente de task_id, suppression');
          localStorage.removeItem('current_cleaning');
        }
        setIsRestoring(false);
        return;
      } catch (e) {
        console.error('Erreur lecture nettoyage sauvegardé:', e);
        localStorage.removeItem('current_cleaning');
      }
    }
    
    console.log('🔍 [UI] Aucun processus en cours trouvé');
    setIsRestoring(false);
  };
  
  // Nettoyer les intervalles au démontage
  useEffect(() => {
    return () => {
      if (cleaningPollingInterval) clearInterval(cleaningPollingInterval);
      if (importPollingInterval) clearInterval(importPollingInterval);
    };
  }, [cleaningPollingInterval, importPollingInterval]);
  
  useEffect(() => {
    checkForOngoingProcess();
  }, []);
  
  // Gestion des fichiers
  const handleSlotFile = (slotKey: RequiredFileKey, incoming: FileList | null) => {
    if (isProcessActive) {
      console.log('⚠️ [UI] Impossible de modifier les fichiers pendant le nettoyage/import');
      return;
    }
    
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
            fileObject: selected,
          },
          revision: previous.revision + 1,
          invalidReason: null,
          filenameHint: null,
        },
      };
    });
  };
  
  const openFilePicker = (slotKey: RequiredFileKey) => {
    if (isProcessActive) {
      console.log('⚠️ [UI] Impossible de sélectionner des fichiers pendant le nettoyage/import');
      return;
    }
    setActiveSlot(slotKey);
    fileInputRef.current?.click();
  };
  
  const removeSlotFile = (slotKey: RequiredFileKey) => {
    if (isProcessActive) {
      console.log('⚠️ [UI] Impossible de supprimer des fichiers pendant le nettoyage/import');
      return;
    }
    setSlotUploads((current) => ({
      ...current,
      [slotKey]: { file: null, revision: 0, invalidReason: null, filenameHint: null },
    }));
  };
  
  const goToDashboard = () => {
    navigate("/app/dashboard");
  };
  
  const goToHistory = () => {
    navigate("/app/history");
  };
  
  if (isRestoring) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Restoring previous session...</p>
        </div>
      </div>
    );
  }
  
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
            const isDisabled = (item.id === 2 && !allRequiredFilesUploaded) || 
                              (item.id === 1 && isProcessActive) ||
                              (item.id === 3 && !taskId && !cleaningStats);
            return (
              <li key={item.id} className="list-none">
                <button
                  type="button"
                  onClick={() => {
                    if (!isDisabled && !isProcessActive) {
                      setStep(item.id);
                    }
                  }}
                  disabled={isDisabled || isProcessActive}
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
                        disabled={isProcessActive}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:border-primary/35 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {file ? "Replace" : "Upload"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlotFile(slot.key)}
                        disabled={(!file && !state.invalidReason) || isProcessActive}
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
              disabled={!allRequiredFilesUploaded || isCleaning || isImporting}
            >
              {isCleaning ? "Cleaning in progress..." : isImporting ? "Import in progress..." : "Clean & Import"}
            </Button>
          </div>
        </section>
      )}

      {/* STEP 2: CLEANING */}
      {step === 2 && isCleaning && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Step 2: Cleaning</h2>
            <p className="text-sm text-muted">Files are being cleaned and validated on the server...</p>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-bg/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Cleaning progress</p>
              <p className="text-sm font-medium text-text">{cleaningProgress}% complete</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-bg">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${cleaningProgress}%` }} />
            </div>
            <p className="mt-3 text-center text-sm text-muted">
              Please wait while your files are being processed...
            </p>
            {currentBatchName && (
              <p className="mt-2 text-center text-xs text-muted">
                Batch: {currentBatchName}
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            <Button 
              type="button" 
              variant="secondary" 
              className="w-auto px-4" 
              onClick={handleCancelCleaning}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}

      {/* STEP 3: IMPORT */}
      {(step === 3 || (step === 2 && !isCleaning)) && cleaningStats && (
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Step 3: Import</h2>
            <p className="text-sm text-muted">Current state: {phase}</p>
          </div>

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

          {(isImporting || phase !== "Queued") && (
            <>
              <div className="mt-4 rounded-xl border border-border bg-bg/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Import progress</p>
                  <p className="text-sm font-medium text-text">{phaseProgress}% complete</p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${phaseProgress}%` }} />
                </div>
              </div>

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
            </>
          )}

          {!isImporting && phase === "Queued" && (
            <div className="mt-4 rounded-xl border border-border bg-bg/30 p-4">
              <p className="text-center text-sm text-muted">
                Cleaning completed. Starting import...
              </p>
              <div className="mt-2 flex justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {phase === "Done" && (
              <Button 
                type="button" 
                variant="secondary"
                className="w-auto px-4" 
                onClick={handleNewImport}
              >
                New Import
              </Button>
            )}
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
          {loadingRecent ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : recentImports.length === 0 ? (
            <div className="text-center py-8 text-muted">No imports yet</div>
          ) : (
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
                {recentImports.map((run) => {
                  const totalRows = run.cleaning_stats?.rows_read || 0;
                  const errors = run.import_stats?.error_count || 0;
                  
                  let statusColor = "";
                  let statusLabel = "";
                  
                  if (run.status === "completed") {
                    statusColor = "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300";
                    statusLabel = "Done";
                  } else if (run.status === "processing") {
                    statusColor = "border-blue-500/25 bg-blue-500/8 text-blue-700 dark:text-blue-300";
                    statusLabel = "Importing";
                  } else if (run.status === "failed") {
                    statusColor = "border-rose-500/25 bg-rose-500/8 text-rose-700 dark:text-rose-300";
                    statusLabel = "Failed";
                  } else {
                    statusColor = "border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-300";
                    statusLabel = "Pending";
                  }
                  
                  return (
                    <tr key={run.id} className="border-b border-border/70 last:border-b-0">
                      <td className="px-3 py-3 text-muted">
                        {new Date(run.import_date).toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", statusColor)}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted">{totalRows.toLocaleString("en-US")}</td>
                      <td className="px-3 py-3 text-muted">{errors}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </motion.div>
  );
}