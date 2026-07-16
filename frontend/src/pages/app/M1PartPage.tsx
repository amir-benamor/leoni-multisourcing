import { motion } from "framer-motion";
import { ArrowLeft, Building2, FolderKanban, PackageSearch, Search, Tag } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { m1Api, M1PartData, M1PartUsageData, M1PartTransportData } from "../../services/m1Api";

const RECENT_SEARCHES_KEY = "ASAP_M1_PART_RECENT_SEARCHES";

function readRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}



function UsageProjectRow({
  name,
  percentage,
  volume,
}: {
  name: string;
  percentage: number;
  volume: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface/70 px-3.5 py-3">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 text-sm font-medium text-text">{name}</span>
        <div className="flex items-center gap-3 text-left sm:text-right">
          <span className="min-w-[42px] text-sm font-semibold text-text">{percentage}%</span>
          <span className="text-xs text-muted">{new Intl.NumberFormat("en-US").format(volume)} units/year</span>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border/45">
        <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} />
      </div>
    </div>
  );
}

function OemUsagePanel({ items }: { items: string[] }) {
  return (
    <section className="rounded-xl border border-border/70 bg-bg/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">OEM usage</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">Technical footprint of this part number across OEM programs.</p>
        </div>
        <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary shadow-sm">
          {items.length} OEMs
        </div>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div key={item} className="rounded-xl border border-border/60 bg-surface/85 px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted">OEM {index + 1}</p>
            <p className="mt-1.5 text-sm font-medium text-text">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RegionDonutChart({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ name: string; volume: number }>;
}) {
  const total = items.reduce((sum, item) => sum + item.volume, 0);
  const palette = ["#173E8F", "#3565C7", "#8EACE6"] as const;
  const segments = items.map((item, index) => ({
    ...item,
    color: palette[index % palette.length],
    sharePercent: total > 0 ? (item.volume / total) * 100 : 0,
  }));

  return (
    <section className="flex min-h-[20rem] w-full flex-col rounded-xl border border-border/70 bg-bg/30 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
        <p className="text-xs leading-relaxed text-muted/80">{subtitle}</p>
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
        <div className="mx-auto h-[13.5rem] w-full max-w-[15rem] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={segments}
                dataKey="volume"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={72}
                paddingAngle={2}
                isAnimationActive
                animationDuration={900}
              >
                {segments.map((segment) => (
                  <Cell key={segment.name} fill={segment.color} />
                ))}
              </Pie>
              <text x="50%" y="47%" textAnchor="middle" className="fill-muted text-[11px]">
                Annual volume
              </text>
              <text x="50%" y="57%" textAnchor="middle" className="fill-text text-[1.25rem] font-semibold">
                {new Intl.NumberFormat("en-US").format(total)}
              </text>
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as { name: string; volume: number; sharePercent: number } | undefined;
                  if (!point) return null;
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-50">
                      <p className="font-medium">{point.name}</p>
                      <p className="mt-1">{new Intl.NumberFormat("en-US").format(point.volume)} units/year</p>
                      <p className="mt-1">{point.sharePercent.toFixed(1)}%</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {segments.map((segment) => (
            <div
              key={segment.name}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/85 px-3 py-1.5 text-[11px] text-muted"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
                <span>{segment.name}</span>
              </div>
              <span className="font-medium text-text">{segment.sharePercent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VolumeColumnChart({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ name: string; volume: number }>;
}) {
  const chartData = items.map((item, index) => ({
    ...item,
    fill: index === 0 ? "#173E8F" : index === 1 ? "#3565C7" : "#8EACE6",
  }));

  return (
    <section className="flex min-h-[21.5rem] w-full flex-col rounded-xl border border-border/70 bg-bg/30 p-4">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
        <p className="text-xs leading-relaxed text-muted/80">{subtitle}</p>
      </div>
      <div className="mt-4 min-h-0 flex-1">
        <div className="h-[15.5rem] rounded-xl border border-border/60 bg-surface/75 px-2.5 py-2.5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 6, left: -4, bottom: 8 }} barCategoryGap={22}>
              <CartesianGrid vertical={false} stroke="rgba(37,84,165,0.10)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "currentColor", fontSize: 10 }}
                tickMargin={6}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fill: "currentColor", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={38}
                tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
              />
              <Tooltip
                cursor={{ fill: "rgba(23,62,143,0.06)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-50">
                      <p className="font-medium">{label}</p>
                      <p className="mt-1">{new Intl.NumberFormat("en-US").format(Number(payload[0].value))} units/year</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="volume" radius={[7, 7, 0, 0]} maxBarSize={34} activeBar={{ fill: "#173E8F" }} isAnimationActive animationDuration={900}>
                {chartData.map((item) => (
                  <Cell key={item.name} fill={item.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function UsageByAccount({
  items,
}: {
  items: M1PartUsageData['usage_by_account'];
}) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-bg/30 p-8 text-center">
        <p className="text-muted">No usage data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {items.map((account) => (
        <section key={account.oem_brand} className="rounded-xl border border-border/70 bg-bg/30 p-4">
          <div className="flex flex-col gap-2 border-b border-border/60 pb-3.5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Customer / Account</p>
              <p className="mt-1.5 text-sm font-semibold text-text">{account.oem_brand}</p>
            </div>
            <div className="flex items-center gap-3 text-left sm:text-right">
              <span className="text-sm font-semibold text-text">{account.percentage}%</span>
              <span className="text-xs text-muted">
                {new Intl.NumberFormat("en-US").format(account.total_volume)} units/year
              </span>
            </div>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {account.projects.map((project) => (
              <UsageProjectRow
                key={`${account.oem_brand}-${project.project_name}`}
                name={project.project_name}
                percentage={project.percentage}
                volume={project.volume}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PlantsList({ plants }: { plants: string[] }) {
  if (!plants || plants.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-bg/30 p-4">
        <p className="text-xs text-muted">Plants using this part</p>
        <p className="mt-2 text-sm text-muted">No plants available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-bg/30 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Plants using this part</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {plants.map((plant) => (
          <span
            key={plant}
            className="rounded-full border border-border/60 bg-surface/70 px-3 py-1.5 text-xs font-medium text-text"
          >
            {plant}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function M1PartPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("query")?.trim() ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // États pour les données API
  const [partData, setPartData] = useState<M1PartData | null>(null);
  const [usageData, setUsageData] = useState<M1PartUsageData | null>(null);
  const [transportData, setTransportData] = useState<M1PartTransportData | null>(null);
  const [loadingPart, setLoadingPart] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [loadingTransport, setLoadingTransport] = useState(false);
  const [, setApiError] = useState<string | null>(null);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Charger les données depuis l'API
  useEffect(() => {
    const fetchPartData = async () => {
      if (!urlQuery) {
        setPartData(null);
        setUsageData(null);
        setTransportData(null);
        setApiError(null);
        return;
      }
      
      setLoadingPart(true);
      setLoadingUsage(true);
      setLoadingTransport(true);
      setApiError(null);
      
      try {
        const [partResult, usageResult, transportResult] = await Promise.all([
          m1Api.getPartById(urlQuery),
          m1Api.getPartUsage(urlQuery),
          m1Api.getPartTransport(urlQuery)
        ]);
        
        if (partResult.success && partResult.data) {
          setPartData(partResult.data);
        } else {
          setPartData(null);
          setApiError(partResult.error || "Part not found");
        }
        
        if (usageResult.success && usageResult.data) {
          setUsageData(usageResult.data);
        }
        
        if (transportResult.success && transportResult.data) {
          setTransportData(transportResult.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setPartData(null);
        setUsageData(null);
        setTransportData(null);
        setApiError("Network error. Please try again.");
      } finally {
        setLoadingPart(false);
        setLoadingUsage(false);
        setLoadingTransport(false);
      }
    };
    
    fetchPartData();
  }, [urlQuery]);

  const saveRecentSearch = (value: string) => {
    const nextValue = value.trim();
    if (!nextValue || typeof window === "undefined") return;

    const nextRecent = [nextValue, ...recentSearches.filter((item) => item !== nextValue)].slice(0, 5);
    setRecentSearches(nextRecent);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecent));
  };

  const matchType = useMemo(() => {
    if (!partData || !urlQuery) return null;
    const normalized = urlQuery.trim().toLowerCase();
    if (partData.leoni_part_number.trim().toLowerCase() === normalized) return "LEONI PN";
    return null;
  }, [partData, urlQuery]);

  const submitSearch = (nextQuery: string) => {
    const normalized = nextQuery.trim();
    if (!normalized) {
      navigate("/app/m1/part");
      return;
    }
    saveRecentSearch(normalized);
    navigate(`/app/m1/part?query=${encodeURIComponent(normalized)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch(query);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-6xl space-y-4"
    >
      <header className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm sm:px-5 sm:py-3.5">
        <div className="flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <PackageSearch className="h-3 w-3" aria-hidden="true" />
            One Part
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.75rem]">Part Data Overview</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Technical consultation of one part using a LEONI PN. This view is focused on part
              identification and technical context only.
            </p>
          </div>

          <nav aria-label="M1 one part actions" className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => navigate("/app/m1")}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to M1
            </button>
            <button
              type="button"
              className="rounded-md px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => navigate("/app/m1/parts")}
            >
              Parts List
            </button>
            <button
              type="button"
              className="rounded-md px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => navigate("/app/m1/material-group")}
            >
              Material Group
            </button>
          </nav>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <Input
              id="m1-one-part-search"
              label="LEONI PN"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter a LEONI Part Number"
              hint="Search by LEONI Part Number to view technical information"
              rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
            />
          </div>
          <div className="flex w-full items-end sm:w-auto">
            <Button type="submit" className="h-11 sm:w-auto sm:min-w-[144px] sm:px-5" disabled={!query.trim() || loadingPart}>
              {loadingPart ? "Loading..." : "Open part"}
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent searches</p>
          {recentSearches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => submitSearch(item)}
                  className="rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No recent searches yet.</p>
          )}
        </div>
      </section>

      {!urlQuery ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center shadow-sm">
          <PackageSearch className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-text">Search one part to start</h2>
          <p className="mt-2 text-sm text-muted">
            Enter a LEONI PN above to open the technical consultation page for one part.
          </p>
        </section>
      ) : loadingPart ? (
        <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
          <p className="mt-4 text-muted">Loading part data...</p>
        </section>
      ) : partData ? (
        <>
          {/* Part summary */}
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Part summary</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border/80 bg-bg/70 px-3 py-1.5 text-[11px] font-medium text-text">
                    LEONI PN: <span className="font-mono">{partData.leoni_part_number}</span>
                  </span>
                  <span className="rounded-full border border-border/80 bg-bg/70 px-3 py-1.5 text-[11px] font-medium text-text">
                    Supplier PN: <span className="font-mono">{partData.supplier_part_number || "Not available"}</span>
                  </span>
                  <span className="rounded-full border border-border/80 bg-bg/70 px-3 py-1.5 text-[11px] font-medium text-text">
                    Supplier: {partData.supplier_group || "Not available"}
                  </span>
                  <span className="rounded-full border border-border/80 bg-bg/70 px-3 py-1.5 text-[11px] font-medium text-text">
                    Material group: {partData.fors_material_group || "Not available"}
                  </span>
                  <span className="rounded-full border border-border/80 bg-bg/70 px-3 py-1.5 text-[11px] font-medium text-text">
                    LEOparts-Classification: {partData.fors_classification || "Not available"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {matchType ? (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary">
                    Match: {matchType}
                  </span>
                ) : null}
                <span className="rounded-full border border-border/80 bg-bg/70 px-3 py-1.5 text-[11px] text-muted">
                  Technical consultation only
                </span>
              </div>
            </div>
          </section>

          {/* PARTIE 1: Part identification */}
          <section className="grid gap-3">
            <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                Part identification
              </div>
              <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-bg/30 p-4">
                  <p className="text-xs text-muted">LEONI PN</p>
                  <p className="mt-2 font-mono text-sm font-medium text-text">{partData.leoni_part_number}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-bg/30 p-4">
                  <p className="text-xs text-muted">Supplier PN</p>
                  <p className="mt-2 font-mono text-sm font-medium text-text">
                    {partData.supplier_part_number || "Not available"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-bg/30 p-4">
                  <p className="text-xs text-muted">Supplier</p>
                  <p className="mt-2 text-sm font-medium text-text">
                    {partData.supplier_group || "Not available"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-bg/30 p-4">
                  <p className="text-xs text-muted">Material group</p>
                  <p className="mt-2 text-sm font-medium text-text">
                    {partData.fors_material_group || "Not available"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-bg/30 p-4 sm:col-span-2">
                  <p className="text-xs text-muted">Part description</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-text">
                    {partData.s4_description || "Not available"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-bg/30 p-4">
                  <p className="text-xs text-muted">Fors classification</p>
                  <p className="mt-2 text-sm font-medium text-text">
                    {partData.fors_classification || "Not available"}
                  </p>
                </div>
                
                <div className="sm:col-span-2">
                  <OemUsagePanel items={partData.oem_applicability} />
                </div>
              </div>
            </article>
          </section>

          {/* PARTIE 2: Component Usage Context */}
          <section className="grid gap-3">
            <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
                Component Usage Context
              </div>
              <div className="mt-4 space-y-3.5">
                {loadingUsage ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <UsageByAccount items={usageData?.usage_by_account || []} />
                )}
                <div className="rounded-xl border border-border/70 bg-bg/30 p-4">
                  <p className="text-xs text-muted">Engineering notes</p>
                  <p className="mt-2 text-sm leading-relaxed text-text">No engineering notes available.</p>
                </div>
              </div>
            </article>

            {/* PARTIE 3: Transport Receipts Context */}
            <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                Transport Receipts Context
              </div>
              <div className="mt-4 space-y-4">
                

                {/* Liste des plants */}
                {loadingTransport ? (
                  <div className="animate-pulse rounded-xl border border-border/70 bg-bg/30 p-4 h-24"></div>
                ) : (
                  <PlantsList plants={transportData?.plants || []} />
                )}

                {/* Total annual volume */}
                <div className="rounded-xl border border-border/70 bg-bg/30 p-4">
                  <p className="text-xs text-muted">Total annual volume</p>
                  <p className="mt-2 text-2xl font-semibold text-text">
                    {loadingTransport ? (
                      <div className="animate-pulse h-8 w-32 bg-border/50 rounded"></div>
                    ) : transportData ? (
                      `${new Intl.NumberFormat("en-US").format(transportData.total_annual_volume)} units/year`
                    ) : (
                      "Not available"
                    )}
                  </p>
                </div>

                {/* Graphiques */}
                <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch">
                  <RegionDonutChart
                    title="Annual volume by region"
                    subtitle="Transport receipts grouped by region"
                    items={transportData?.volume_by_region || []}
                  />
                  <VolumeColumnChart
                    title="Annual volume by country"
                    subtitle="Transport receipts context"
                    items={transportData?.volume_by_country || []}
                  />
                </div>
                  <VolumeColumnChart
                    title="Annual volume by plant"
                    subtitle="Transport receipts grouped by plant (LOKID)"
                    items={transportData?.volume_by_plant || []}
                  />
              </div>
            </article>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center shadow-sm">
          <PackageSearch className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-text">Part not found</h2>
          <p className="mt-2 text-sm text-muted">
            No technical part overview is currently available for <span className="font-mono">{urlQuery}</span>.
          </p>
          <p className="mt-1 text-sm text-muted">Try searching again with another LEONI PN.</p>
        </section>
      )}
    </motion.section>
  );
}