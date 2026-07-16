import { useState, useEffect } from "react";
import { cn } from "../../lib/cn";
import { exploreApi, MatrixRow, MatrixCell } from "../../services/exploreApi";

const statusClass: Record<string, string> = {
  "green": "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  "blue": "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  "yellow": "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  "red": "bg-rose-500/15 text-rose-800 dark:text-rose-300",
};

const legendItems: Array<{ label: string; color: string }> = [
  { label: "Released (Compatible)", color: "green" },
  { label: "Released (Compatible interface)", color: "blue" },
  { label: "Not released (Compatible)", color: "yellow" },
  { label: "Not released (Compatible interface)", color: "red" },
];

interface StatusMatrixProps {
  customer: string;
  region: string;
  materialGroup: string;
  subtitle: string;
  classification?: string;
}

export function StatusMatrix({ customer, region, materialGroup, subtitle, classification }: StatusMatrixProps) {
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [technicalPct, setTechnicalPct] = useState(0);
  const [releasedPct, setReleasedPct] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchMatrix = async () => {
      if (!customer || !region) return;

      setLoading(true);
      setError(null);

      try {
        const result = await exploreApi.getStatusMatrix(customer, region, materialGroup);

        if (result.success && result.data) {
          setSuppliers(result.data.suppliers);
          setRows(result.data.rows);
          setTechnicalPct(result.data.technical_alternative_pct);
          setReleasedPct(result.data.released_alternative_pct);
        } else {
          setError(result.error || 'Failed to load matrix data');
        }
      } catch (err) {
        console.error('Error fetching status matrix:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMatrix();
  }, [customer, region, materialGroup]);

  // Réinitialiser showAll quand les filtres changent
  useEffect(() => {
    setShowAll(false);
  }, [customer, region, materialGroup]);

  const classificationLabel = classification || 'component';

  const technicalSummary = `For ${classificationLabel}s of ${customer}, ${technicalPct}% a technical alternative is available`;
  const releasedSummary = `For ${classificationLabel}s of ${customer}, ${releasedPct}% a released alternative is available`;

  // Top 10 ou tous
  const displayedRows = showAll ? rows : rows.slice(0, 10);
  const hasMore = rows.length > 10;

  // Loading state
  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm animate-pulse">
        <div className="h-5 w-48 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-96 bg-slate-200 rounded mb-4" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text">Multisourcing status matrix</h3>
        <p className="mt-2 text-sm text-rose-600">Failed to load matrix data: {error}</p>
      </section>
    );
  }

  // Empty state
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text">Multisourcing status matrix</h3>
        <p className="mt-2 text-sm text-muted">No matrix data available for the selected filters.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm" aria-label="Multisourcing status matrix">
      <div>
        <h3 className="text-sm font-semibold text-text">Multisourcing status matrix</h3>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>

      <div className="mt-4">
        <div className="min-w-0 overflow-x-auto overscroll-x-contain">
          <table className="min-w-full table-auto border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="text-left uppercase tracking-wide text-muted">
                <th scope="col" className="border-b border-border bg-surface px-3 py-2 font-medium whitespace-nowrap sticky left-0 z-10 bg-surface">Contact system</th>
                <th scope="col" className="border-b border-border bg-surface px-3 py-2 font-medium whitespace-nowrap">Volume 2026</th>
                <th scope="col" className="border-b border-border bg-surface px-3 py-2 font-medium whitespace-nowrap">%</th>
                {suppliers.map((supplier) => (
                  <th
                    key={supplier}
                    scope="col"
                    className="border-b border-border bg-surface px-3 py-2 text-center font-medium whitespace-nowrap"
                  >
                    {supplier}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row) => (
                <tr key={row.classification} className="border-b border-border/70 transition-colors hover:bg-primary/5">
                  <th scope="row" className="border-b border-border/70 bg-surface px-3 py-2 font-medium text-text whitespace-nowrap sticky left-0 z-10 bg-surface">
                    {row.classification}
                  </th>
                  <td className="border-b border-border/70 bg-surface px-3 py-2 text-muted whitespace-nowrap">
                    {row.volume2026.toLocaleString("en-US")}
                  </td>
                  <td className="border-b border-border/70 bg-surface px-3 py-2 text-muted whitespace-nowrap">
                    {row.share.toFixed(2)}%
                  </td>
                  {suppliers.map((supplier) => {
                    const cell: MatrixCell | null = row.cells[supplier] || null;
                    return (
                      <td
                        key={`${row.classification}-${supplier}`}
                        className="border-b border-border/70 px-3 py-2 text-center align-middle"
                      >
                        {cell && cell.classification ? (
                          <span
                            className={cn(
                              "inline-flex min-h-8 w-full min-w-[100px] items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold leading-tight whitespace-nowrap",
                              cell.color ? statusClass[cell.color] : ""
                            )}
                          >
                            {cell.classification}
                          </span>
                        ) : (
                          <span className="text-muted/50">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* View more / View less */}
        {hasMore && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-xs font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {showAll
                ? "View less"
                : `View more (${rows.length - 10} remaining)`}
            </button>
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="mt-4 rounded-xl border border-border bg-bg/70 px-3 py-2" aria-label="Matrix legend">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:flex-nowrap lg:gap-x-5">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-text">
              <span className={cn("h-3 w-3 flex-shrink-0 rounded-sm", statusClass[item.color])} aria-hidden="true" />
              <span className="whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Résumés */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <p className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          {technicalSummary}
        </p>
        <p className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          {releasedSummary}
        </p>
      </div>
    </section>
  );
}