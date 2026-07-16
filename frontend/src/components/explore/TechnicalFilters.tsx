import { useState, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { exploreApi } from "../../services/exploreApi";

interface TechnicalFiltersProps {
  selectedClassification: string;
  onClassificationChange: (value: string) => void;
  onClearFilters: () => void;
}

const fieldClass =
  "relative flex h-14 min-w-0 flex-col justify-center rounded-xl border border-border bg-surface px-3 transition-colors hover:border-primary/35 focus-within:ring-2 focus-within:ring-ring/40";

export function TechnicalFilters({
  selectedClassification,
  onClassificationChange,
  onClearFilters,
}: TechnicalFiltersProps) {
  const [classifications, setClassifications] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les classifications depuis l'API
  useEffect(() => {
    const loadClassifications = async () => {
      try {
        const result = await exploreApi.getClassifications();
        if (result.success && result.data) {
          setClassifications(result.data.classifications);
          
          // Si aucune classification n'est sélectionnée, prendre la première
          if (!selectedClassification && result.data.classifications.length > 0) {
            onClassificationChange(result.data.classifications[0]);
          }
        }
      } catch (error) {
        console.error("Failed to load classifications:", error);
      } finally {
        setLoading(false);
      }
    };

    loadClassifications();
  }, []);

  const hasActiveFilter = classifications.length > 0 && selectedClassification !== classifications[0];

  return (
    <section className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm sm:p-4" aria-label="Technical filters">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text">Technical filters</h2>
          <p className="mt-0.5 text-xs text-muted">Component material group analysis for multisourcing pass.</p>
        </div>
        <button
          type="button"
          onClick={onClearFilters}
          disabled={loading || classifications.length === 0}
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-bg/70 px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:border-primary/25 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Reset local filters
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <label className={cn(fieldClass, loading && "pointer-events-none opacity-60")}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Component material group</span>
          <select
            value={selectedClassification}
            onChange={(event) => onClassificationChange(event.target.value)}
            disabled={loading}
            className="mt-1 w-full appearance-none bg-transparent pr-5 text-xs font-medium text-text outline-none"
            aria-label="Component material group"
          >
            {loading ? (
              <option value="">Loading...</option>
            ) : classifications.length === 0 ? (
              <option value="">No classifications available</option>
            ) : (
              classifications.map((classification) => (
                <option 
                  key={classification} 
                  value={classification}
                  className="text-slate-800 bg-white dark:text-slate-100 dark:bg-slate-800"
                >
                  {classification}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
        </label>
      </div>

      {/* Affichage du filtre actif */}
      {hasActiveFilter && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            Active filter: {selectedClassification}
            <button
              onClick={onClearFilters}
              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
              aria-label="Remove filter"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}
    </section>
  );
}