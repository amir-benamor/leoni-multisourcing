import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";
import { useFilters } from "../../context/FiltersContext";
import type { SupplierResultRow } from "../../data/mockSupplierDetail";
import { formatCurrencyCompact, formatNumber, formatPercent } from "../../lib/format";

const MOCK_HIGH_RISK_THRESHOLD = 90;

type FilterMode = "all" | "high-risk" | "highest-savings";

interface SupplierResultsGridProps {
  rows: SupplierResultRow[];
  supplier: string;
}

function StatusBadge({ status }: { status: "Released" | "Tech only" | "Not released" }) {
  const classes = {
    Released: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    "Tech only": "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    "Not released": "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  } as const;

  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", classes[status])}>{status}</span>;
}

export function SupplierResultsGrid({ rows, supplier }: SupplierResultsGridProps) {
  const navigate = useNavigate();
  const { filters } = useFilters();
  const selectedSupplier = filters.suppliers[0] ?? supplier;

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");
  const [openMs, setOpenMs] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const filteredRows = useMemo(() => {
    let base = [...rows];

    if (filterMode === "high-risk") {
      base = base
        .filter((row) => row.selectedSupplierShare >= MOCK_HIGH_RISK_THRESHOLD)
        .sort((a, b) => b.selectedSupplierShare - a.selectedSupplierShare);
    } else if (filterMode === "highest-savings") {
      base = base.sort((a, b) => b.savingsPotential - a.savingsPotential);
    } else {
      base = base.sort((a, b) => b.selectedSupplierShare - a.selectedSupplierShare);
    }

    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((row) => row.msNumber.toLowerCase().includes(q));
  }, [filterMode, query, rows]);

  const activeRow = openMs
    ? filteredRows.find((row) => row.msNumber === openMs) ?? rows.find((row) => row.msNumber === openMs) ?? null
    : null;

  useEffect(() => {
    if (!openMs) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (modalRef.current?.contains(target)) return;
      setOpenMs(null);
    };

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMs(null);
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onEsc);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [openMs]);

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied`);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied("Copy failed");
      window.setTimeout(() => setCopied(null), 1200);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm" aria-label="Supplier results">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-sm font-semibold text-text">Results</h3>

        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Search by MS number</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by MS number..."
            className="h-10 w-full rounded-xl border border-border bg-bg pl-9 pr-3 text-sm text-text transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {["all", "high-risk", "highest-savings"].map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setFilterMode(mode as FilterMode)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              filterMode === mode ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-bg text-muted"
            )}
          >
            {mode === "all" ? "All" : mode === "high-risk" ? "High risk" : "Highest savings"}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[1060px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-3 py-2 font-medium">MS Number</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="px-3 py-2 font-medium">SELECTED SUPPLIER SHARE</th>
              <th scope="col" className="px-3 py-2 font-medium">Total volume</th>
              <th scope="col" className="px-3 py-2 font-medium">Savings E/yr</th>
              <th scope="col" className="px-3 py-2 font-medium">Parts</th>
              <th scope="col" className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const partCount = row.supplierPNs.length + row.altPNs.length;
              return (
                <tr key={row.msNumber} className="border-b border-border/70 transition-colors hover:bg-primary/5">
                  <td className="px-3 py-3 font-medium text-text">{row.msNumber}</td>
                  <td className="px-3 py-3"><StatusBadge status={row.bestStatus} /></td>
                  <td
                    className="px-3 py-3 text-muted"
                    title={`Group top supplier: ${row.topSupplierName} | ${formatPercent(row.topSupplierShare)}`}
                  >
                    {selectedSupplier} • {formatPercent(row.selectedSupplierShare)}
                  </td>
                  <td className="px-3 py-3 text-muted">{formatNumber(row.totalVolume)}</td>
                  <td className="px-3 py-3 text-muted">{formatCurrencyCompact(row.savingsPotential)}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenMs(row.msNumber)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      View parts ({partCount})
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/app/m3/component/${row.msNumber}`)}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        View detail
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/app/m3/business-case?ms=${encodeURIComponent(row.msNumber)}&supplier=${encodeURIComponent(selectedSupplier)}`)}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        Create business case
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openMs && activeRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div ref={modalRef} className="w-full max-w-xl rounded-2xl border border-border bg-surface p-4 shadow-panel">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-base font-semibold text-text">Part numbers for {activeRow.msNumber}</h4>
              <button
                type="button"
                onClick={() => setOpenMs(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary/35 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-label="Close part numbers modal"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Supplier PNs</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {activeRow.supplierPNs.map((pn) => (
                    <span key={pn} className="rounded-md border border-border bg-bg px-1.5 py-0.5 font-mono text-[11px] text-text">{pn}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Alternative PNs</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {activeRow.altPNs.map((pn) => (
                    <span key={pn} className="rounded-md border border-border bg-bg px-1.5 py-0.5 font-mono text-[11px] text-text">{pn}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => copyText("MS", activeRow.msNumber)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:border-primary/35">Copy MS</button>
              <button type="button" onClick={() => copyText("Supplier PNs", activeRow.supplierPNs.join("\n"))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:border-primary/35">Copy Supplier PNs</button>
              <button type="button" onClick={() => copyText("Alt PNs", activeRow.altPNs.join("\n"))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:border-primary/35">Copy Alt PNs</button>
              {copied ? <span className="text-xs text-primary">{copied}</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
