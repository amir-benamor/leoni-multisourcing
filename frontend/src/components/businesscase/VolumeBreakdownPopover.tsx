import { useMemo, useState } from "react";
import type { VolumeEntry } from "../../data/mockBusinessCase";

type BreakdownTab = "customer" | "region";

interface VolumeBreakdownPopoverProps {
  title: string;
  byCustomer: VolumeEntry[];
  byRegion: VolumeEntry[];
  baselineByCustomer?: VolumeEntry[];
  baselineByRegion?: VolumeEntry[];
  editableCustomer?: boolean;
  onChangeCustomerVolume?: (name: string, volume: number) => void;
  onApplyPercentToAll?: (percent: number) => void;
  buttonLabel?: string;
  initialTab?: BreakdownTab;
  onResetToBaseline?: () => boolean;
}

function total(entries: VolumeEntry[]) {
  return entries.reduce((sum, row) => sum + row.volume, 0);
}

export function VolumeBreakdownPopover({
  title,
  byCustomer,
  byRegion,
  baselineByCustomer,
  baselineByRegion,
  editableCustomer = false,
  onChangeCustomerVolume,
  onApplyPercentToAll,
  buttonLabel = "View breakdown",
  initialTab = "customer",
  onResetToBaseline,
}: VolumeBreakdownPopoverProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<BreakdownTab>(initialTab);
  const [percentInput, setPercentInput] = useState("");
  const rows = tab === "customer" ? byCustomer : byRegion;
  const baselineRows = tab === "customer" ? baselineByCustomer ?? byCustomer : baselineByRegion ?? byRegion;
  const grandTotal = useMemo(() => total(rows), [rows]);

  const handleReset = () => {
    const didReset = onResetToBaseline?.() ?? false;
    if (!didReset) setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setTab(initialTab);
          setOpen((current) => !current);
        }}
        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {buttonLabel}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[430px] max-w-[92vw] rounded-xl border border-border bg-surface p-3 shadow-panel">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-primary/35 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Close
            </button>
          </div>

          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setTab("customer")}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                tab === "customer" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted"
              }`}
            >
              By customer
            </button>
            <button
              type="button"
              onClick={() => setTab("region")}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                tab === "region" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted"
              }`}
            >
              By region
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary"
            >
              Reset to baseline
            </button>
          </div>

          {editableCustomer && tab === "customer" ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-bg/50 px-2 py-2">
              <span className="text-xs text-muted">Apply +/- % to all</span>
              <input
                type="number"
                value={percentInput}
                onChange={(event) => setPercentInput(event.target.value)}
                placeholder="e.g. -5"
                className="h-8 w-24 rounded-md border border-border bg-surface px-2 text-xs text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <button
                type="button"
                onClick={() => {
                  const parsed = Number(percentInput);
                  if (!Number.isFinite(parsed)) return;
                  onApplyPercentToAll?.(parsed);
                }}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text hover:border-primary/35 hover:text-primary"
              >
                Apply
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left uppercase tracking-wide text-muted">
                  <th className="px-2 py-2 font-medium">{tab === "customer" ? "Name" : "Region"}</th>
                  <th className="px-2 py-2 text-right font-medium">Baseline</th>
                  <th className="px-2 py-2 text-right font-medium">Scenario</th>
                  <th className="px-2 py-2 text-right font-medium">Delta</th>
                  <th className="px-2 py-2 text-right font-medium">% of total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const baseline = baselineRows.find((entry) => entry.name === row.name)?.volume ?? row.volume;
                  const delta = row.volume - baseline;
                  const pct = grandTotal > 0 ? (row.volume / grandTotal) * 100 : 0;
                  return (
                    <tr key={`${tab}-${row.name}`} className="border-b border-border/70">
                      <td className="px-2 py-2 text-text">{row.name}</td>
                      <td className="px-2 py-2 text-right text-muted">{baseline.toLocaleString("en-US")}</td>
                      <td className="px-2 py-2 text-right text-muted">
                        {editableCustomer && tab === "customer" ? (
                          <input
                            type="number"
                            min={0}
                            value={row.volume}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              onChangeCustomerVolume?.(row.name, Number.isFinite(next) ? Math.max(0, Math.round(next)) : 0);
                            }}
                            className="h-7 w-24 rounded-md border border-border bg-surface px-2 text-right text-xs text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                          />
                        ) : (
                          row.volume.toLocaleString("en-US")
                        )}
                      </td>
                      <td className={`px-2 py-2 text-right ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {delta >= 0 ? "+" : ""}
                        {delta.toLocaleString("en-US")}
                      </td>
                      <td className="px-2 py-2 text-right text-muted">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-bg/60">
                  <td className="px-2 py-2 font-semibold text-text">Total</td>
                  <td className="px-2 py-2 text-right font-semibold text-text">
                    {total(baselineRows).toLocaleString("en-US")}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-text">{grandTotal.toLocaleString("en-US")}</td>
                  <td className="px-2 py-2 text-right font-semibold text-text">
                    {(grandTotal - total(baselineRows)) >= 0 ? "+" : ""}
                    {(grandTotal - total(baselineRows)).toLocaleString("en-US")}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-text">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
