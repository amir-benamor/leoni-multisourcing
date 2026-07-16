import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Database, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer as BarResponsiveContainer, Cell as BarCell } from "recharts";
import { useFilters } from "../../context/FiltersContext";
import { dashboardApi, KpiItem, DonutDatum, MarketShareDatum, RegionalFocusRow, DashboardData } from "../../services/dashboardApi";
import { cn } from "../../lib/cn";

// ─── Skeletons ───────────────────────────────────────────────────────────────
function Skeleton({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-border/55", className)} aria-hidden="true" />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-surface p-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-2 h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4"><Skeleton className="h-64 w-full" /></div>
        <div className="rounded-2xl border border-border bg-surface p-4"><Skeleton className="h-64 w-full" /></div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4"><Skeleton className="h-72 w-full" /></div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
const toneClass: Record<KpiItem["tone"], string> = {
  positive: "border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(16,185,129,0.03))]",
  warning: "border-amber-500/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03))]",
  critical: "border-rose-500/20 bg-[linear-gradient(180deg,rgba(244,63,94,0.08),rgba(244,63,94,0.03))]",
  neutral: "border-primary/15 bg-[linear-gradient(180deg,rgba(21,98,224,0.08),rgba(21,98,224,0.03))]",
};

function KpiCard({ item }: { item: KpiItem }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const clickable = Boolean(item.href);

  return (
    <motion.button
      type="button"
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      onClick={() => { if (item.href) navigate(item.href); }}
      className={cn(
        "flex h-full min-h-[10.5rem] w-full flex-col rounded-2xl border p-4 text-left shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        toneClass[item.tone],
        clickable ? "hover:border-primary/35 hover:shadow-premium" : "cursor-default"
      )}
      aria-label={clickable ? `${item.title} ${item.value}. Open details` : `${item.title} ${item.value}`}
    >
      <div className="flex h-full flex-col">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{item.title}</p>
        <p className="mt-2.5 text-[2rem] font-semibold leading-none tracking-tight text-text">{item.value}</p>
        <p className="mt-2.5 max-w-[22rem] text-xs leading-5 text-muted">{item.helper}</p>
        <div className="mt-auto pt-3">
          <div className="h-1.5 w-12 rounded-full bg-black/5 dark:bg-white/10" aria-hidden="true">
            <div
              className={cn(
                "h-full rounded-full",
                item.tone === "positive" ? "bg-emerald-500/70" :
                item.tone === "warning" ? "bg-amber-500/75" :
                item.tone === "critical" ? "bg-rose-500/75" : "bg-primary/75"
              )}
              style={{ width: item.key === "criticalSingleSource" ? "88%" : "100%" }}
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Status Donut ────────────────────────────────────────────────────────────
function MaturityTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload?: { count: number } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-50">
      <p className="font-medium">{payload[0].name}</p>
      <p className="mt-1">{Number(payload[0].value).toFixed(1)}%</p>
      <p className="mt-1">{payload[0].payload?.count?.toLocaleString("en-US")} MS groups</p>
    </div>
  );
}

function StatusDonut({ data, totalGroups }: { data: DonutDatum[]; totalGroups: number }) {
  return (
    <div className="flex h-full min-h-[23.5rem] flex-col rounded-2xl border border-border bg-surface shadow-sm">
      <div className="p-5 pb-0 min-h-[3.75rem]">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Coverage profile</p>
        <h3 className="mt-1 text-sm font-semibold text-text">Multisourcing maturity</h3>
      </div>
      <div className="mt-2 h-[16.75rem]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={64} outerRadius={96} paddingAngle={2} isAnimationActive animationDuration={900}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <text x="50%" y="47%" textAnchor="middle" className="fill-muted text-[11px]">Total MS groups</text>
            <text x="50%" y="57%" textAnchor="middle" className="fill-text text-[1.65rem] font-semibold">{totalGroups.toLocaleString("en-US")}</text>
            <Tooltip cursor={false} content={<MaturityTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 px-5 pb-5">
        {data.map((item) => (
          <div key={item.name} className="rounded-xl border border-border/70 bg-bg/35 px-3 py-2 text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span>{item.name}</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <strong className="text-text">{item.value.toFixed(1)}%</strong>
              <span>{item.count.toLocaleString("en-US")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Market Share Bar ────────────────────────────────────────────────────────
function ShareTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-50">
      <p className="font-medium">{label}</p>
      <p className="mt-1">{Number(payload[0].value).toFixed(1)}% market share</p>
    </div>
  );
}

function MarketShareBar({ data }: { data: MarketShareDatum[] }) {
  return (
    <div className="flex h-full min-h-[23.5rem] flex-col rounded-2xl border border-border bg-surface shadow-sm">
      <div className="p-5 pb-0 min-h-[3.75rem]">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Supplier ranking</p>
        <h3 className="mt-1 text-sm font-semibold text-text">Supplier market share</h3>
        <p className="mt-1 text-xs leading-5 text-muted">Annual terminal volume share by supplier in the selected scope.</p>
      </div>
      <div className="mt-2 h-[16.75rem] px-2">
        <BarResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 2 }} barCategoryGap={18}>
            <XAxis dataKey="supplier" tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(value) => `${value}%`} tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} width={38} />
            <Tooltip cursor={{ fill: "rgba(21,98,224,0.08)" }} content={<ShareTooltip />} />
            <Bar dataKey="share" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900} activeBar={{ fill: "#1562e0", stroke: "rgba(21,98,224,0.45)", strokeWidth: 1 }}>
              {data.map((entry, index) => (
                <BarCell
                  key={entry.supplier}
                  fill={index === 0 ? "#1562e0" : index === 1 ? "rgba(21,98,224,0.68)" : "rgba(21,98,224,0.38)"}
                />
              ))}
            </Bar>
          </BarChart>
        </BarResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Regional Focus Table ────────────────────────────────────────────────────
const availabilityPillClass: Record<string, string> = {
  "Released (Compatible)": "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Released (Compatible interface)": "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "Not released (Compatible)": "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Not released (Compatible interface)": "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  "Unsecured": "border-slate-400/30 bg-slate-400/10 text-slate-700 dark:text-slate-300",
};

function formatVolume(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return `${Math.round(value / 1_000)}K`;
}

function RegionalFocusTable({ rows }: { rows: RegionalFocusRow[] }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.25 }}
      className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
      aria-label="Concentration hotspots"
    >
      <header>
        <h3 className="text-sm font-semibold text-text">Concentration hotspots</h3>
        <p className="mt-1 text-sm text-muted">Highest supplier-dependency hotspots in the selected scope</p>
      </header>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-3 py-2 text-left font-medium">MS number</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Dominant supplier</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Supplier share</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Best availability</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">Annual volume</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.msNumber} className="border-b border-border/70 transition-colors hover:bg-primary/5 focus-within:bg-primary/5">
                <th scope="row" className="px-3 py-3.5 font-medium text-text">{row.msNumber}</th>
                <td className="px-3 py-3.5 text-muted">{row.dominantSupplier}</td>
                <td className="px-3 py-3.5">
                  <div className="font-medium text-text">{row.supplierShare}%</div>
                  <div className="mt-1.5 h-1.5 w-28 rounded-full bg-primary/10" aria-hidden="true">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${row.supplierShare}%` }} />
                  </div>
                </td>
                <td className="px-3 py-3.5 align-middle">
                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", availabilityPillClass[row.bestAvailability] || "")}>
                    {row.bestAvailability}
                  </span>
                </td>
                <td className="px-3 py-3.5 text-text">{formatVolume(row.annualVolume)}</td>
                <td className="px-3 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => navigate(row.href)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg/35 px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    aria-label={`Open hotspot ${row.msNumber} in Explore`}
                  >
                    View in Explore
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}

// ─── Main Dashboard Page ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { filters } = useFilters();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filters.customer || !filters.region) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await dashboardApi.getData(filters.customer, filters.region);
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to load dashboard');
        }
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, [filters.customer, filters.region]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <p className="text-rose-500">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 rounded-xl border border-border bg-bg px-4 py-2 text-sm">Retry</button>
      </div>
    );
  }

  if (!data || data.kpis.length === 0) {
    return (
      <div  className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <Database className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-semibold text-text">No data available</h2>
        <p className="mt-2 text-sm text-muted">Import latest sourcing files to generate executive overview insights.</p>
        <button
          type="button"
          onClick={() => navigate("/app/import")}
          className="mt-5 rounded-xl border border-border bg-bg px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          Import Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filter info */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm sm:p-4"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Executive Overview</h1>
          <p className="mt-1 text-sm leading-6 text-muted">
            Track sourcing maturity, concentration risks, and executive priorities in the selected perimeter.
          </p>
          <div className="relative mt-3 rounded-xl border border-border/70 bg-bg/25 px-3.5 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Filter behavior on this page</h2>
              <span className="rounded-full border border-border/70 bg-surface/85 px-2.5 py-1 text-[11px] font-medium text-muted">
                Snapshot: {filters.snapshot}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1.5 text-[12px] text-muted">
              <p className="rounded-full border border-border/60 bg-surface/70 px-2.5 py-1">
                <span className="font-semibold text-text">Applied:</span> Customer, Region, Snapshot
              </p>
              <p className="rounded-full border border-border/60 bg-surface/70 px-2.5 py-1">
                Executive aggregated view for the selected perimeter
              </p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* KPIs - 3 cards full width */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.key} item={kpi} />
        ))}
      </div>

      {/* Charts row */}
      <section className="grid gap-4 xl:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatusDonut data={data.maturity} totalGroups={data.maturityTotalGroups} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <MarketShareBar data={data.marketShare} />
        </motion.div>
      </section>

      {/* Concentration hotspots table */}
      <RegionalFocusTable rows={data.concentrationHotspots} />
    </div>
  );
}