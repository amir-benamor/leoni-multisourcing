import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Check, ChevronDown, RotateCcw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "../../lib/cn";
import { globalFiltersApi, SnapshotOption } from "../../services/globalFilters";
import { updateCustomerOptions, SUPPLIER_OPTIONS, type GlobalFiltersState, type Region } from "./filterConfig";

interface GlobalFiltersProps {
  filters: GlobalFiltersState;
  setFilters: Dispatch<SetStateAction<GlobalFiltersState>>;
  onReset: () => void;
  disabled?: boolean;
}

const fieldClass =
  "relative flex h-14 min-w-0 flex-col justify-center rounded-xl border border-border bg-surface px-3 transition-colors hover:border-primary/35 focus-within:ring-2 focus-within:ring-ring/40";

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  customClassName = "", // ✅ NOUVEAU : permet d'ajouter des classes personnalisées
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  customClassName?: string; // ✅ NOUVEAU
}) {
  return (
    <label className={cn(fieldClass, disabled && "pointer-events-none opacity-60", customClassName)}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 w-full appearance-none bg-transparent pr-5 text-xs font-medium text-text outline-none"
        aria-label={label}
      >
        {options.map((option) => (
          <option 
            key={option} 
            value={option}
            className="text-slate-800 bg-white dark:text-slate-100 dark:bg-slate-800"
          >
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
    </label>
  );
}

export function GlobalFilters({ filters, setFilters, onReset, disabled = false }: GlobalFiltersProps) {
  const location = useLocation();
  const [openSuppliers, setOpenSuppliers] = useState(false);
  const supplierRef = useRef<HTMLDivElement | null>(null);
  
  // États pour les données de l'API
  const [customers, setCustomers] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>(["EMEA", "AMERICAS", "ASIA"]);
  const [snapshots, setSnapshots] = useState<SnapshotOption[]>([]);
  const [loading, setLoading] = useState(true);

  const isM3Route =
    location.pathname.startsWith("/app/m3") ||
    location.pathname.startsWith("/app/m3/component") ||
    location.pathname.startsWith("/app/component") ||
    location.pathname.startsWith("/app/ms") ||
    location.pathname.startsWith("/app/dashboard") ||
    location.pathname.startsWith("/app/explore") ||
    location.pathname.startsWith("/app/business-case");
    
  const useCompactUserFilters =
    isM3Route ||
    location.pathname.startsWith("/app/import") ||
    location.pathname.startsWith("/app/history") ||
    location.pathname.startsWith("/app/settings");

  // Charger les options depuis l'API
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const result = await globalFiltersApi.getFilters();
        if (result.success && result.data) {
          setCustomers(result.data.customers);
          setRegions(result.data.regions);
          setSnapshots(result.data.snapshots);
          
          // 🔥 Mettre à jour les options globales pour FiltersContext
          updateCustomerOptions(result.data.customers);
          
          // Initialiser SEULEMENT si les valeurs actuelles sont vides
          setFilters(prev => {
            const updates: Partial<GlobalFiltersState> = {};
            
            if (!prev.customer || prev.customer === "None") {
              if (result.data!.customers.length > 0) {
                updates.customer = result.data!.customers[0];
              }
            }
            
            if (!prev.snapshot) {
              if (result.data!.snapshots.length > 0) {
                const latest = result.data!.snapshots.find(s => s.is_latest) || result.data!.snapshots[0];
                updates.snapshot = latest.name;
              }
            }
            
            return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
          });
        }
      } catch (error) {
        console.error("Failed to load global filters:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFilters();
  }, []);

  // Options pour le mode compact
  const customerOptions = useCompactUserFilters 
    ? customers 
    : ["LEONI", "All Customers"];
  
  const snapshotOptions = snapshots.length > 0 
    ? snapshots.map(s => s.name) 
    : ["Latest import", "Previous import"];

  const currentCustomerValue = customerOptions.includes(filters.customer) 
    ? filters.customer 
    : customerOptions[0] || "";

  const currentSnapshotValue = snapshotOptions.includes(filters.snapshot) 
    ? filters.snapshot 
    : snapshotOptions[0] || "";

  useEffect(() => {
    if (useCompactUserFilters || !openSuppliers) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!supplierRef.current?.contains(event.target as Node)) {
        setOpenSuppliers(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenSuppliers(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [useCompactUserFilters, openSuppliers]);

  const supplierLabel =
    filters.suppliers.length === 0
      ? "None"
      : filters.suppliers.length <= 2
        ? filters.suppliers.join(", ")
        : `${filters.suppliers.length} selected`;

  const toggleSupplier = (name: string) => {
    setFilters((current) => {
      const exists = current.suppliers.includes(name);
      return {
        ...current,
        suppliers: exists
          ? current.suppliers.filter((item) => item !== name)
          : [...current.suppliers, name],
      };
    });
  };

  // Mode compact : M3, Explore, Dashboard, etc.
  if (useCompactUserFilters) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FilterSelect
          label="Customer"
          value={currentCustomerValue}
          options={customerOptions}
          onChange={(value) => setFilters((current) => ({ ...current, customer: value }))}
          disabled={disabled || loading}
          customClassName="filter-group-customer" // ✅ AJOUT : classe pour cibler Customer
        />

        <FilterSelect
          label="Region"
          value={filters.region}
          options={regions}
          onChange={(value) => setFilters((current) => ({ ...current, region: value as Region }))}
          disabled={disabled || loading}
          customClassName="filter-group-region" // ✅ AJOUT : classe pour cibler Region
        />

        <FilterSelect
          label="Snapshot"
          value={currentSnapshotValue}
          options={snapshotOptions}
          onChange={(value) => setFilters((current) => ({ ...current, snapshot: value }))}
          disabled={disabled || loading}
        />

        <button
          type="button"
          onClick={onReset}
          disabled={disabled || loading}
          className="inline-flex h-14 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-muted transition-colors hover:border-primary/35 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>
    );
  }

  // Mode complet : M1, M2
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      <FilterSelect
        label="Customer"
        value={currentCustomerValue}
        options={customerOptions}
        onChange={(value) => setFilters((current) => ({ ...current, customer: value }))}
        disabled={disabled || loading}
        customClassName="filter-group-customer" // ✅ AJOUT : classe pour cibler Customer
      />

      <FilterSelect
        label="Region"
        value={filters.region}
        options={regions}
        onChange={(value) => setFilters((current) => ({ ...current, region: value as Region }))}
        disabled={disabled || loading}
        customClassName="filter-group-region" // ✅ AJOUT : classe pour cibler Region
      />

      <FilterSelect
        label="Plant"
        value={filters.plant}
        options={["All Plants"]}
        onChange={(value) => setFilters((current) => ({ ...current, plant: value }))}
        disabled={disabled || loading}
      />

      <FilterSelect
        label="Project"
        value={filters.project}
        options={["All Projects"]}
        onChange={(value) => setFilters((current) => ({ ...current, project: value }))}
        disabled={disabled || loading}
      />

      <FilterSelect
        label="Family"
        value={filters.family}
        options={["All Families"]}
        onChange={(value) => setFilters((current) => ({ ...current, family: value }))}
        disabled={disabled || loading}
      />

      <div ref={supplierRef} className={cn("relative min-w-0", disabled && "pointer-events-none opacity-60")}>
        <button
          type="button"
          onClick={() => setOpenSuppliers((prev) => !prev)}
          disabled={disabled || loading}
          className={cn(fieldClass, "w-full items-start text-left")}
          aria-expanded={openSuppliers}
          aria-haspopup="listbox"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Supplier</span>
          <span className="mt-1 w-full truncate text-xs font-medium text-text">{supplierLabel}</span>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
        </button>

        {openSuppliers ? (
          <div
            className="absolute left-0 top-16 z-40 w-full min-w-[220px] rounded-xl border border-border bg-surface p-2 shadow-panel"
            role="listbox"
            aria-label="Supplier multi select"
          >
            <div className="max-h-56 space-y-1 overflow-y-auto p-1">
              {SUPPLIER_OPTIONS.map((supplier) => {
                const checked = filters.suppliers.includes(supplier);
                return (
                  <button
                    key={supplier}
                    type="button"
                    onClick={() => toggleSupplier(supplier)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-text transition-colors hover:bg-bg"
                    aria-selected={checked}
                  >
                    <span>{supplier}</span>
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 items-center justify-center rounded border",
                        checked ? "border-primary bg-primary text-white" : "border-border text-transparent"
                      )}
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <FilterSelect
        label="Snapshot"
        value={currentSnapshotValue}
        options={snapshotOptions}
        onChange={(value) => setFilters((current) => ({ ...current, snapshot: value }))}
        disabled={disabled || loading}
      />

      <button
        type="button"
        onClick={onReset}
        disabled={disabled || loading}
        className="inline-flex h-14 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-medium text-muted transition-colors hover:border-primary/35 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Reset
      </button>
    </div>
  );
}