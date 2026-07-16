import { motion } from "framer-motion";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ActionTodoList, TaskItem } from "../../components/businesscase/ActionTodoList";
import { BusinessCaseTable } from "../../components/businesscase/BusinessCaseTable";
import { MarketShareBeforeAfterChart } from "../../components/businesscase/MarketShareBeforeAfterChart";
import { Button } from "../../components/ui/Button";
import { businessCaseApi, BcPart, RecommendScenario, MarketShareItem } from "../../services/businessCaseApi";
import { TrendingUp, AlertTriangle, Package } from "lucide-react";

const RECENT_SEARCHES_KEY = "ASAP_BC_RECENT_SEARCHES";

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

function saveRecentSearchToStorage(value: string, recentSearches: string[], setRecentSearches: (searches: string[]) => void) {
  const nextValue = value.trim().toUpperCase();
  if (!nextValue || typeof window === "undefined") return;

  const nextRecent = [nextValue, ...recentSearches.filter((item) => item !== nextValue)].slice(0, 5);
  setRecentSearches(nextRecent);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecent));
}

const PURCHASE_REGIONS = ["CHINA", "EMEA", "AMERICAS"] as const;
const USAGE_MARKETS = ["ASIA", "EMEA", "AMERICAS", "GLOBAL"] as const;

type PurchaseRegion = (typeof PURCHASE_REGIONS)[number];
type UsageMarket = (typeof USAGE_MARKETS)[number];

function formatSaving(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

type Eligibility = "restricted" | "eligible";

function eligibilityClasses(status: Eligibility) {
  return status === "restricted"
    ? "border-rose-500/35 bg-rose-500/10 text-rose-700"
    : "border-emerald-500/35 bg-emerald-500/10 text-emerald-700";
}

type RiskLevel = "Low" | "Medium" | "High";

function getRiskIconAndColor(riskLevel: RiskLevel) {
  switch (riskLevel) {
    case "Low":
      return { color: "text-emerald-600", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", description: "Clients mostly released, supplier diversification OK" };
    case "Medium":
      return { color: "text-amber-600", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20", description: "Some OEM gaps or moderate dependency" };
    case "High":
      return { color: "text-rose-600", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/20", description: "Blocked OEM approval or high dependency" };
  }
}

type BcTableRow = {
  reference: string;
  currentPn: string;
  currentSupplier: string;
  targetPn: string;
  targetSupplier: string;
  compatibility: string;
  oemDetails: { oem: string; status: "Released" | "Not released" }[];
  currentPrice: number;
  targetPrice: number;
  deltaPrice: number;
  totalAnnualVolume: number;
  annualSaving: number;
};

function readTasksFromStorage(msNumber: string): TaskItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`ASAP_BC_TASKS_${msNumber}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function BusinessCasePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parts, setParts] = useState<BcPart[]>([]);
  const [marketShare, setMarketShare] = useState<MarketShareItem[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendScenario | null>(null);
  const [scenarioSearch, setScenarioSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>({});
  const [recommendationDetailsOpen, setRecommendationDetailsOpen] = useState(false);
  const [fullSwitch, setFullSwitch] = useState(false);
  const [purchaseRegion, setPurchaseRegion] = useState<PurchaseRegion>("EMEA");
  const [usageMarket, setUsageMarket] = useState<UsageMarket>("EMEA");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const msFromQuery = searchParams.get("ms");
  const queryCurrentPn = searchParams.get("currentPn") ?? searchParams.get("current") ?? "";
  const queryTargetPn = searchParams.get("targetPn") ?? searchParams.get("target") ?? "";
  const bcIdFromQuery = searchParams.get("bc_id");
  const bcId = bcIdFromQuery ? parseInt(bcIdFromQuery) : null;
  const activeMsNumber = msFromQuery || "";

  const [tasks, setTasks] = useState<TaskItem[]>(() => readTasksFromStorage(activeMsNumber));

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  useEffect(() => {
    setTasks(readTasksFromStorage(activeMsNumber));
  }, [activeMsNumber]);

  useEffect(() => {
    if (!bcId) return;
    (async () => {
      setLoading(true);
      try {
        const result = await businessCaseApi.getDetail(bcId);
        if (result.success && result.data) {
          const data = result.data;
          setPurchaseRegion(data.purchase_region as PurchaseRegion);
          setUsageMarket(data.usage_market as UsageMarket);
          setFullSwitch(data.full_switch);
          setSearchParams({ ms: data.ms_number, current: data.current_part || "", target: data.target_part || "", bc_id: String(bcId) });
          if (data.tasks?.length) setTasks(data.tasks as TaskItem[]);
          if (data.notes_json) setSavedNotes(data.notes_json);
          setToast("Scenario loaded");
        }
      } catch {
        setToast("Error loading scenario");
      } finally {
        setLoading(false);
      }
    })();
  }, [bcId]);

  const loadData = useCallback(async () => {
    if (!activeMsNumber) return;
    setLoading(true);
    setError(null);
    try {
      const [msResult, recResult] = await Promise.all([
        businessCaseApi.loadMsGroup(activeMsNumber, purchaseRegion, usageMarket),
        businessCaseApi.recommend(activeMsNumber, purchaseRegion, usageMarket),
      ]);
      if (msResult.success && msResult.data) {
        setParts(msResult.data.parts);
        setMarketShare(msResult.data.market_share);
      } else {
        setError(msResult.error || "Failed to load");
      }
      if (recResult.success && recResult.data?.best_scenario) {
        setRecommendation(recResult.data.best_scenario);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [activeMsNumber, purchaseRegion, usageMarket]);

  useEffect(() => { loadData(); }, [loadData]);

  const allCurrentPns = useMemo(() => parts.map(p => p.leoni_part_number), [parts]);
  const currentPn = fullSwitch ? "all" : (queryCurrentPn || parts[0]?.leoni_part_number || "");
  const targetPn = queryTargetPn || parts[0]?.leoni_part_number || "";
  const currentPart = parts.find(p => p.leoni_part_number === currentPn) || null;
  const targetPart = parts.find(p => p.leoni_part_number === targetPn) || null;
  const currentSupplier = currentPart?.supplier_group || "";
  const effectiveTargetSupplier = targetPart?.supplier_group || "";

  const computedRows: BcTableRow[] = useMemo(() => {
    if (!targetPart) return [];
    if (fullSwitch) {
      return parts
        .filter(p => p.leoni_part_number !== targetPart.leoni_part_number)
        .map(p => {
          const dp = (p.unit_price || 0) - (targetPart.unit_price || 0);
          return {
            reference: p.leoni_part_number, currentPn: p.leoni_part_number, currentSupplier: p.supplier_group,
            targetPn: targetPart.leoni_part_number, targetSupplier: targetPart.supplier_group,
            compatibility: p.compatibility_status || "-",
            oemDetails: Array.from({ length: p.oem_total }).map((_, i) => ({
              oem: `OEM ${i + 1}`, status: (i < p.oem_released ? "Released" : "Not released") as "Released" | "Not released",
            })),
            currentPrice: p.unit_price || 0, targetPrice: targetPart.unit_price || 0,
            deltaPrice: dp, totalAnnualVolume: p.usage_volume, annualSaving: dp * p.usage_volume,
          };
        });
    }
    if (!currentPart) return [];
    const dp = (currentPart.unit_price || 0) - (targetPart.unit_price || 0);
    return [{
      reference: currentPart.leoni_part_number, currentPn: currentPart.leoni_part_number,
      currentSupplier: currentPart.supplier_group, targetPn: targetPart.leoni_part_number,
      targetSupplier: targetPart.supplier_group, compatibility: currentPart.compatibility_status || "-",
      oemDetails: Array.from({ length: currentPart.oem_total }).map((_, i) => ({
        oem: `OEM ${i + 1}`, status: (i < currentPart.oem_released ? "Released" : "Not released") as "Released" | "Not released",
      })),
      currentPrice: currentPart.unit_price || 0, targetPrice: targetPart.unit_price || 0,
      deltaPrice: dp, totalAnnualVolume: currentPart.usage_volume, annualSaving: dp * currentPart.usage_volume,
    }];
  }, [parts, currentPart, targetPart, fullSwitch]);

  const annualSaving = computedRows.reduce((s, r) => s + r.annualSaving, 0);
  const totalVolume = computedRows.reduce((s, r) => s + r.totalAnnualVolume, 0);
  const riskLevel: RiskLevel = recommendation?.risk_level === "low" ? "Low" : recommendation?.risk_level === "medium" ? "Medium" : "High";
  const { color, bgColor, borderColor, description } = getRiskIconAndColor(riskLevel);
  const scenarioEligibility: Eligibility = riskLevel === "High" ? "restricted" : "eligible";

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); } }, [toast]);

  const updateUrl = (updates: Record<string, string>) => {
    const params: Record<string, string> = {};
    searchParams.forEach((v, k) => { params[k] = v; });
    Object.assign(params, updates);
    setSearchParams(params);
  };

  const handleOpenMs = (msNumber: string) => {
    const normalized = msNumber.trim().toUpperCase();
    if (!normalized) return;
    saveRecentSearchToStorage(normalized, recentSearches, setRecentSearches);
    setSearchParams({ ms: normalized });
    setScenarioSearch("");
  };

  const handleSave = async () => {
    const payload = {
      ms_number: activeMsNumber,
      current_part: fullSwitch ? undefined : currentPn,
      target_part: targetPn,
      scenario_type: fullSwitch ? "full" as const : "selective" as const,
      full_switch: fullSwitch,
      purchase_region: purchaseRegion,
      usage_market: usageMarket,
      notes_json: savedNotes,
      tasks: tasks.map(t => ({ title: t.title, note: t.note || "", due_date: t.dueDate || undefined, status: t.status || "TODO", owner: t.owner || "Engineering" })),
    };
    const result = await businessCaseApi.save(payload);
    if (result.success) {
      setToast(`Saved (ID: ${result.data?.id})`);
      if (result.data?.id) updateUrl({ bc_id: String(result.data.id) });
    } else {
      setToast("Save failed");
    }
  };

  if (loading && parts.length === 0) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  if (!activeMsNumber) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h1 className="text-2xl font-semibold">Business Case</h1>
          <p className="mt-2 text-sm text-muted">Enter an MS number to create a business case scenario.</p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex gap-3">
              <input 
                type="search" 
                value={scenarioSearch} 
                onChange={e => setScenarioSearch(e.target.value.toUpperCase())} 
                placeholder="Search MS (e.g., MS000112)" 
                className="h-11 w-full rounded-xl border bg-bg px-3 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') handleOpenMs(scenarioSearch); }}
              />
              <Button onClick={() => handleOpenMs(scenarioSearch)}>Open</Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent searches</p>
              {recentSearches.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleOpenMs(item)}
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
          </div>
        </section>
      </motion.div>
    );
  }

  return (
    <motion.div id="export-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3.5">
      {/* HEADER */}
      <section className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-premium">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-text">Business Case</h1>
              <p className="text-sm text-muted">
                Change from {currentSupplier} to {effectiveTargetSupplier} (Usage market: {usageMarket})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/80 bg-bg/70 px-3 py-1 text-[11px] font-medium text-text">
                MS Number: {activeMsNumber}
              </span>

              <label className="flex items-center gap-1 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                Current PN
                <select
                  value={currentPn}
                  onChange={e => updateUrl({ current: e.target.value })}
                  disabled={fullSwitch}
                  className="h-7 min-w-[120px] rounded-full border border-border bg-bg/70 px-2 text-[11px] font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                >
                  {allCurrentPns.map(pn => (
                    <option key={pn} value={pn}>{pn}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                Target PN
                <select
                  value={targetPn}
                  onChange={e => updateUrl({ target: e.target.value })}
                  className="h-7 min-w-[120px] rounded-full border border-border bg-bg/70 px-2 text-[11px] font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {parts.map(p => (
                    <option key={p.leoni_part_number} value={p.leoni_part_number}>{p.leoni_part_number}</option>
                  ))}
                </select>
              </label>

              <button
                onClick={() => setFullSwitch(!fullSwitch)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${fullSwitch ? "bg-primary/15 text-primary" : "border border-border text-muted"}`}
              >
                Full Switch {fullSwitch && "✓"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-1.5">
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Purchase region</span>
                <div className="flex flex-nowrap gap-1 rounded-full border border-border bg-bg/70 p-0.5">
                  {PURCHASE_REGIONS.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => setPurchaseRegion(region)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        purchaseRegion === region ? "bg-primary/15 text-primary" : "text-muted"
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="flex items-center gap-1 whitespace-nowrap"
                title={purchaseRegion === "CHINA" ? "Locked: China purchase region requires ASIA usage market." : "Usage market is selectable."}
              >
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Usage market</span>
                <div className="flex flex-nowrap gap-1 rounded-full border border-border bg-bg/70 p-0.5">
                  {USAGE_MARKETS.map((market) => (
                    <button
                      key={market}
                      type="button"
                      disabled={purchaseRegion === "CHINA" && market !== "ASIA"}
                      onClick={() => setUsageMarket(market)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        usageMarket === market ? "bg-primary/15 text-primary" : "text-muted"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {market}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 lg:max-w-sm lg:flex-nowrap lg:justify-end">
            <span
              title={scenarioEligibility === "restricted" ? "This scenario has constraints (e.g., purchase region rules or customer release coverage)." : "Eligible: region/market and scenario-relevant OEM release conditions are currently valid."}
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${eligibilityClasses(scenarioEligibility)}`}
            >
              Scenario: {scenarioEligibility}
            </span>

            {purchaseRegion === "CHINA" ? (
              <span className="inline-flex rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                China-only -&gt; Asia market
              </span>
            ) : (
              <span className="inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                Global eligible
              </span>
            )}
          </div>
        </div>
      </section>

      {/* KPIS */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 p-5 transition-all hover:shadow-lg hover:shadow-emerald-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-600/70">Annual Saving</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{formatSaving(annualSaving)}</p>
              <p className="mt-1 text-xs text-emerald-600/60">Estimated yearly savings</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/40 to-emerald-500/10 group-hover:h-1 transition-all" />
        </div>

        <div className={`group relative overflow-hidden rounded-xl border ${borderColor} bg-gradient-to-br ${bgColor} p-5 transition-all hover:shadow-lg cursor-help`} title={description}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Risk Level</p>
              <p className={`mt-2 text-2xl font-bold ${color}`}>{riskLevel}</p>
              <p className="mt-1 text-xs text-muted">Implementation risk assessment</p>
            </div>
            <div className={`rounded-xl ${bgColor} p-2.5`}>
              <AlertTriangle className={`h-5 w-5 ${color}`} />
            </div>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${color === 'text-emerald-600' ? 'from-emerald-500/40 to-emerald-500/10' : color === 'text-amber-600' ? 'from-amber-500/40 to-amber-500/10' : 'from-rose-500/40 to-rose-500/10'} group-hover:h-1 transition-all`} />
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-5 transition-all hover:shadow-lg hover:shadow-blue-500/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-blue-600/70">Total Volume</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{totalVolume.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs text-blue-600/60">Units per year</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/40 to-blue-500/10 group-hover:h-1 transition-all" />
        </div>
      </section>

      {/* Market Share */}
      <MarketShareBeforeAfterChart beforeData={marketShare} afterData={marketShare} currentSupplier={fullSwitch ? undefined : currentSupplier} targetSupplier={effectiveTargetSupplier} fullSwitch={fullSwitch} />

      {/* Recommendation */}
      {recommendation && !fullSwitch && (
        <section className="rounded-2xl border bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] text-primary">Recommended</span>
              <span className="ml-2 font-mono text-sm">{recommendation.target_part}</span>
              <span className="text-muted"> | {recommendation.target_supplier}</span>
              <div className="mt-1 flex gap-2">
                <span className="rounded-full border bg-primary/10 px-2 py-0.5 text-xs text-primary">Saving: {formatSaving(recommendation.annual_saving)}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${color} ${bgColor}`}>Risk: {recommendation.risk_level}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateUrl({ target: recommendation.target_part })}>Apply</Button>
              {recommendation.reasons && <Button variant="ghost" onClick={() => setRecommendationDetailsOpen(true)}>Details</Button>}
            </div>
          </div>
        </section>
      )}

      {/* Recommendation modal */}
      {recommendationDetailsOpen && recommendation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border bg-surface p-4">
            <div className="flex justify-between"><h4 className="font-semibold">Recommendation</h4><button onClick={() => setRecommendationDetailsOpen(false)} className="text-xs">Close</button></div>
            <div className="mt-3 space-y-2 text-xs">
              <p className="font-semibold">Why</p>
              <ul className="list-disc pl-5">{recommendation.reasons?.map((r, i) => <li key={i}>{r}</li>)}</ul>
              <p className="font-semibold mt-2">Scores</p>
              <p>Release Risk: {recommendation.release_risk}%</p>
              <p>Concentration: {recommendation.supplier_concentration_risk}%</p>
              <p>Risk Score: {recommendation.risk_score}</p>
              <p>Score: {recommendation.score}/100</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <BusinessCaseTable rows={computedRows} savedNotes={savedNotes} onSaveLine={(ref, note) => { setSavedNotes(c => ({ ...c, [ref]: note })); }} />

      {/* Tasks */}
      <ActionTodoList msNumber={activeMsNumber} initialTasks={tasks} onTasksChange={setTasks} />

      {/* Bottom bar */}
      <section className="sticky bottom-3 z-40 rounded-2xl border bg-surface/95 p-3 backdrop-blur">
        <div className="flex justify-between">
          <Button onClick={handleSave}>Save scenario</Button>
          <Button variant="secondary" onClick={() => navigate("/app/explore")}>Open Explore</Button>
        </div>
      </section>

      {toast && <div className="fixed bottom-4 right-4 z-50 rounded-xl border bg-surface px-4 py-2 text-sm shadow-premium">{toast}</div>}
    </motion.div>
  );
}