import { cn } from "../../lib/cn";
import type { SupplierHotspot } from "../../data/mockSupplierDetail";
import { formatPercent } from "../../lib/format";

interface HotspotsTableProps {
  rows: SupplierHotspot[];
  supplier: string;
  onExplore: (row: SupplierHotspot) => void;
}

function riskFromShare(share: number) {
  if (share >= 95) return "High";
  if (share >= 75) return "Med";
  return "Low";
}

const riskClass = {
  High: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  Med: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
} as const;

export function HotspotsTable({ rows, supplier, onExplore }: HotspotsTableProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm" aria-label="Supplier hotspots">
      <h3 className="text-sm font-semibold text-text">Hotspots</h3>
      <p className="mt-1 text-xs text-muted">Where concentration is highest for this supplier.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-3 py-2 font-medium">Region</th>
              <th scope="col" className="px-3 py-2 font-medium">Family</th>
              <th scope="col" className="px-3 py-2 font-medium">Top share %</th>
              <th scope="col" className="px-3 py-2 font-medium">Risk</th>
              <th scope="col" className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const risk = riskFromShare(row.topShare);
              const disabled = row.topShare <= 0;
              return (
                <tr key={row.id} className="border-b border-border/70 transition-colors hover:bg-primary/5">
                  <td className="px-3 py-3 font-medium text-text">{row.region}</td>
                  <td className="px-3 py-3 text-muted">{row.family}</td>
                  <td className="px-3 py-3 text-muted">
                    <div>{formatPercent(row.topShare)}</div>
                    <div className="mt-1 h-1.5 w-24 rounded-full bg-primary/10" aria-hidden="true">
                      <div className="h-full rounded-full bg-primary/70" style={{ width: `${row.topShare}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", riskClass[risk])}>{risk}</span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onExplore(row)}
                      disabled={disabled}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-border disabled:hover:text-text"
                      aria-label={`Explore hotspot ${row.region} ${row.family} for ${supplier}`}
                    >
                      {disabled ? "N/A" : "Explore"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
