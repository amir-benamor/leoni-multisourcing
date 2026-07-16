import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SupplierShare = {
  supplier: string;
  percentage: number;
};

interface MarketShareBeforeAfterChartProps {
  /** Parts de marché AVANT le switch */
  beforeData: SupplierShare[];
  /** Parts de marché APRÈS le switch */
  afterData: SupplierShare[];
  /** Supplier actuel (pour le mode selective) */
  currentSupplier?: string;
  /** Supplier cible */
  targetSupplier: string;
  /** Mode full switch ou selective */
  fullSwitch?: boolean;
}

export function MarketShareBeforeAfterChart({
  beforeData,
  afterData,
  currentSupplier,
  targetSupplier,
  fullSwitch = false,
}: MarketShareBeforeAfterChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Construire les données pour le graphique
    const allSuppliers = new Set<string>();
    beforeData.forEach((d) => allSuppliers.add(d.supplier));
    afterData.forEach((d) => allSuppliers.add(d.supplier));

    const beforeMap: Record<string, number> = {};
    const afterMap: Record<string, number> = {};
    beforeData.forEach((d) => (beforeMap[d.supplier] = d.percentage));
    afterData.forEach((d) => (afterMap[d.supplier] = d.percentage));

    const stackedData = Array.from(allSuppliers).map((supplier) => ({
      supplier,
      before: beforeMap[supplier] || 0,
      after: afterMap[supplier] || 0,
      delta: (afterMap[supplier] || 0) - (beforeMap[supplier] || 0),
    }));

    // Trier par "before" décroissant
    stackedData.sort((a, b) => b.before - a.before);
    setChartData(stackedData);
  }, [beforeData, afterData]);

  // Trouver les valeurs pour current et target
  const currentBefore = beforeData.find((d) => d.supplier === currentSupplier)?.percentage || 0;
  const currentAfter = afterData.find((d) => d.supplier === currentSupplier)?.percentage || 0;
  const targetBefore = beforeData.find((d) => d.supplier === targetSupplier)?.percentage || 0;
  const targetAfter = afterData.find((d) => d.supplier === targetSupplier)?.percentage || 0;

  const currentDelta = currentAfter - currentBefore;
  const targetDelta = targetAfter - targetBefore;

  if (chartData.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-base font-semibold text-text">Market share before/after</h3>
        <p className="mt-2 text-sm text-muted">No data available</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-text">Market share before/after</h3>
        <p className="text-xs text-muted">
          {fullSwitch
            ? `Full switch to ${targetSupplier} - all suppliers shown`
            : `Compare ${currentSupplier} vs ${targetSupplier}`}
        </p>
      </div>

      {/* Cartes résumé current vs target */}
      {!fullSwitch && currentSupplier && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-slate-400/20 bg-slate-500/[0.05] px-3 py-2.5 text-xs">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{currentSupplier}</p>
            <p className="mt-1 text-slate-700/80 dark:text-slate-300/85">
              <span className="font-medium text-slate-900 dark:text-slate-100">Before</span> {currentBefore}% →{" "}
              <span className="font-medium text-slate-900 dark:text-slate-100">After</span> {currentAfter}% 
              ({currentDelta >= 0 ? "+" : ""}{currentDelta.toFixed(1)} pts)
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] px-3 py-2.5 text-xs">
            <p className="font-semibold text-blue-900 dark:text-blue-100">{targetSupplier}</p>
            <p className="mt-1 text-blue-900/70 dark:text-blue-200/80">
              <span className="font-medium text-blue-950 dark:text-blue-50">Before</span> {targetBefore}% →{" "}
              <span className="font-medium text-blue-950 dark:text-blue-50">After</span> {targetAfter}% 
              ({targetDelta >= 0 ? "+" : ""}{targetDelta.toFixed(1)} pts)
            </p>
          </div>
        </div>
      )}

      {/* Tableau de tous les suppliers (full switch) */}
      {fullSwitch && (
        <div className="mt-3 space-y-2">
          {chartData.map((item) => (
            <div key={item.supplier} className="flex items-center justify-between rounded-lg border border-border bg-bg/40 px-3 py-2 text-xs">
              <span className="font-medium text-text">{item.supplier}</span>
              <span className="text-muted">
                {item.before}% → {item.after}% 
                <span className={item.delta > 0 ? "text-emerald-600 ml-1" : item.delta < 0 ? "text-rose-600 ml-1" : "ml-1"}>
                  ({item.delta >= 0 ? "+" : ""}{item.delta.toFixed(1)} pts)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Graphique stacked */}
      <div className="mt-4 h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[
              { phase: "Before", ...Object.fromEntries(chartData.map((d) => [d.supplier, d.before])) },
              { phase: "After", ...Object.fromEntries(chartData.map((d) => [d.supplier, d.after])) },
            ]}
            layout="vertical"
            margin={{ left: 10, right: 18, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
            <YAxis dataKey="phase" type="category" tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              contentStyle={{
                background: "#ffffff",
                border: "1px solid rgba(148,163,184,0.35)",
                borderRadius: 10,
                color: "#0f172a",
              }}
            />
            {chartData.map((item, index) => {
              const colors = ["#2563eb", "#64748b", "#0f766e", "#d97706", "#7c3aed", "#db2777"];
              return (
                <Bar
                  key={item.supplier}
                  dataKey={item.supplier}
                  stackId="share"
                  fill={item.supplier === targetSupplier ? "#2563eb" : colors[index % colors.length]}
                  name={item.supplier}
                  barSize={28}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}