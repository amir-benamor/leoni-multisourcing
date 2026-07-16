import { motion } from "framer-motion";
import {  FileDown, FileWarning, History, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HistoryDrawer } from "../../components/history/HistoryDrawer";
import { Button } from "../../components/ui/Button";
import { historyApi, ImportRun, BusinessCaseHistory, ActivityItem } from "../../services/historyApi";
import { cn } from "../../lib/cn";

type TabId = "imports" | "business-cases" | "activity";
type ActivityFilter = "all" | ActivityItem["type"];
type DateFilter = "7d" | "30d" | "all";

function formatDateTime(value: string) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function matchesQuery(values: Array<string | number>, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some(v => String(v).toLowerCase().includes(q));
}

function statusPillClass(status: string) {
  if (status === "completed") return "border-emerald-500/35 bg-emerald-500/12 text-emerald-700";
  if (status === "failed") return "border-rose-500/35 bg-rose-500/12 text-rose-700";
  if (status === "processing") return "border-blue-500/35 bg-blue-500/12 text-blue-700";
  return "border-amber-500/35 bg-amber-500/12 text-amber-700";
}

function getStatusLabel(status: string) {
  if (status === "completed") return "Done";
  if (status === "failed") return "Failed";
  if (status === "processing") return "Importing";
  return "Pending";
}

function activityIcon(type: ActivityItem["type"]) {
  if (type === "import") return <FileDown className="h-4 w-4 text-blue-500" />;
  if (type === "scenario") return <History className="h-4 w-4 text-emerald-500" />;
  return <FileWarning className="h-4 w-4 text-amber-500" />;
}

const FILE_NAMES: Record<string, string> = {
  tech_data: "LEOpart Technical Data",
  transport: "LTF Transport Receipts",
  project: "LTF Comp Usage",
  prices: "MatDB Active Prices",
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("imports");
  const [search, setSearch] = useState("");
  const [selectedRun, setSelectedRun] = useState<ImportRun | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSection, setDrawerSection] = useState<"issues" | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<BusinessCaseHistory | null>(null);
  const [taskModal, setTaskModal] = useState<ActivityItem | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [importRuns, setImportRuns] = useState<ImportRun[]>([]);
  const [businessCases, setBusinessCases] = useState<BusinessCaseHistory[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [imp, bcs, act] = await Promise.all([
          historyApi.getImports(),
          historyApi.getBusinessCases(),
          historyApi.getActivity(),
        ]);
        setImportRuns(imp);
        setBusinessCases(bcs);
        setActivityFeed(act);
      } catch {
        setError("Failed to load history data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredImports = useMemo(() =>
    importRuns.filter(run => {
      const filesArr = run.files ? Object.values(run.files).filter((f): f is string => f !== null) : [];
      return matchesQuery([run.batch_name, run.status, ...filesArr, run.cleaning_stats?.rows_read || 0, run.import_stats?.imported_rows || 0, run.import_stats?.error_count || 0, run.import_stats?.warning_count || 0], search);
    }), [importRuns, search]);

  const filteredBusinessCases = useMemo(() =>
    businessCases.filter(bc =>
      matchesQuery([bc.id, bc.ms_number, bc.scenario_type, bc.purchase_region, bc.usage_market, bc.current_part || "", bc.target_part || ""], search)
    ), [businessCases, search]);

  const filteredActivity = useMemo(() => {
    const now = Date.now();
    const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : null;
    return activityFeed
      .filter(item => activityFilter === "all" || item.type === activityFilter)
      .filter(item => !days || (now - new Date(item.createdAt).getTime()) / 86400000 <= days)
      .filter(item => matchesQuery([item.title, item.subtitle, item.type], search));
  }, [activityFeed, activityFilter, dateFilter, search]);

  const activityCounts = useMemo(() => ({
    all: activityFeed.length,
    import: activityFeed.filter(i => i.type === "import").length,
    scenario: activityFeed.filter(i => i.type === "scenario").length,
    task: activityFeed.filter(i => i.type === "task").length,
  }), [activityFeed]);

  const openDetails = (run: ImportRun, section: "issues" | null = null) => {
    setSelectedRun(run);
    setDrawerSection(section);
    setDrawerOpen(true);
  };

  const openActivityItem = (item: ActivityItem) => {
    if (item.type === "import") {
      const run = importRuns.find(r => r.id.toString() === item.runId || r.batch_name === item.runId);
      if (run) { openDetails(run); return; }
    }
    if (item.type === "scenario") {
      const bc = businessCases.find(b => b.ms_number === item.msNumber);
      if (bc) { setSelectedScenario(bc); return; }
    }
    setTaskModal(item);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-[400px]"><p className="text-rose-500">{error}</p><Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="text-2xl font-semibold">History</h1><p className="mt-1 text-sm text-muted">Track imports, scenarios, and activity.</p></div>
          <label className="relative block w-full lg:w-[420px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="h-11 w-full rounded-xl border bg-bg/60 pl-10 pr-3 text-sm" />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          {[{ id: "imports", label: "Imports" }, { id: "business-cases", label: "Business Cases" }, { id: "activity", label: "Activity" }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabId)} className={cn("rounded-xl border px-3 py-2 text-sm font-medium", activeTab === tab.id ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-bg/40 text-muted")}>{tab.label}</button>
          ))}
        </div>

        <div className="mt-4">
          {/* IMPORTS */}
          {activeTab === "imports" && (
            <div className="overflow-x-auto rounded-xl border">
              {filteredImports.length === 0 ? (
                <div className="py-10 text-center"><p className="text-sm text-muted">No imports found.</p><Button className="mt-2" onClick={() => navigate("/app/import")}>Go to Import</Button></div>
              ) : (
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-bg/50"><tr className="text-left text-xs uppercase text-muted"><th className="px-3 py-2">Date/Time</th><th className="px-3 py-2">Run ID</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Files</th><th className="px-3 py-2">Rows</th><th className="px-3 py-2">Issues</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
                  <tbody>
                    {filteredImports.map(run => {
                      const filesList = run.files ? Object.entries(run.files).filter(([, v]) => v).map(([k]) => FILE_NAMES[k] || k) : [];
                      const totalRows = run.cleaning_stats?.rows_read || 0;
                      const importedRows = run.import_stats?.imported_rows || 0;
                      const errors = run.import_stats?.error_count || 0;
                      const warnings = run.import_stats?.warning_count || 0;
                      return (
                        <tr key={run.id} className="border-t">
                          <td className="px-3 py-2">{formatDateTime(run.import_date)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{run.batch_name}</td>
                          <td className="px-3 py-2"><span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", statusPillClass(run.status))}>{getStatusLabel(run.status)}</span></td>
                          <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{filesList.map(f => <span key={f} className="inline-flex rounded-full border px-2 py-0.5 text-xs border-emerald-500/30 bg-emerald-500/8 text-emerald-700">{f}</span>)}</div></td>
                          <td className="px-3 py-2"><p className="text-sm">Imported {importedRows.toLocaleString()} / Total {totalRows.toLocaleString()}</p></td>
                          <td className="px-3 py-2"><button onClick={() => openDetails(run, "issues")} className="rounded-lg border px-2 py-1 text-xs"><span className="text-rose-600">E:{errors}</span><span className="mx-1">|</span><span className="text-amber-600">W:{warnings}</span></button></td>
                          <td className="px-3 py-2 text-right"><Button variant="secondary" className="px-3 py-1.5 text-xs h-8" onClick={() => openDetails(run)}>View details</Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* BUSINESS CASES */}
          {activeTab === "business-cases" && (
            <div className="overflow-x-auto rounded-xl border">
              {filteredBusinessCases.length === 0 ? (
                <div className="py-10 text-center"><p className="text-sm text-muted">No scenarios found.</p><Button className="mt-2" onClick={() => navigate("/app/explore")}>Go to Explore</Button></div>
              ) : (
                <table className="min-w-[800px] w-full text-sm">
                  <thead className="bg-bg/50"><tr className="text-left text-xs uppercase text-muted"><th className="px-3 py-2">Date</th><th className="px-3 py-2">MS Number</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Current → Target</th><th className="px-3 py-2">Region / Market</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
                  <tbody>
                    {filteredBusinessCases.map(bc => (
                      <tr key={bc.id} className="border-t">
                        <td className="px-3 py-2">{formatDateTime(bc.created_at)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{bc.ms_number}</td>
                        <td className="px-3 py-2"><span className="rounded-full border px-2 py-0.5 text-xs">{bc.scenario_type}{bc.full_switch ? " (Full)" : ""}</span></td>
                        <td className="px-3 py-2 text-xs">{bc.current_part || "All"} → {bc.target_part || "-"}</td>
                        <td className="px-3 py-2 text-xs">{bc.purchase_region} / {bc.usage_market}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => navigate(`/app/m3/business-case?ms=${encodeURIComponent(bc.ms_number)}&bc_id=${bc.id}`)} className="rounded-lg border px-2 py-1 text-xs text-muted hover:border-primary/35">Open</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ACTIVITY */}
          {activeTab === "activity" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {[{ id: "all", label: `All (${activityCounts.all})` }, { id: "import", label: `Imports (${activityCounts.import})` }, { id: "scenario", label: `Scenarios (${activityCounts.scenario})` }, { id: "task", label: `Tasks (${activityCounts.task})` }].map(f => (
                  <button key={f.id} onClick={() => setActivityFilter(f.id as ActivityFilter)} className={cn("rounded-xl border px-3 py-1.5 text-xs", activityFilter === f.id ? "border-primary/35 bg-primary/10 text-primary" : "border-border text-muted")}>{f.label}</button>
                ))}
              </div>
              <div className="flex gap-2">
                {[{ id: "7d", label: "7d" }, { id: "30d", label: "30d" }, { id: "all", label: "All" }].map(f => (
                  <button key={f.id} onClick={() => setDateFilter(f.id as DateFilter)} className={cn("rounded-xl border px-3 py-1.5 text-xs", dateFilter === f.id ? "border-primary/35 bg-primary/10 text-primary" : "border-border text-muted")}>{f.label}</button>
                ))}
              </div>
              <div className="space-y-2 rounded-xl border bg-bg/35 p-3">
                {filteredActivity.length === 0 ? <p className="text-sm text-muted">No activity found.</p> : filteredActivity.map(item => (
                  <button key={item.id} onClick={() => openActivityItem(item)} className="flex w-full items-start gap-3 rounded-lg border bg-surface px-3 py-2 text-left hover:border-primary/35">
                    <span className="mt-0.5">{activityIcon(item.type)}</span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted">{item.subtitle}</p></div>
                    <span className="text-xs text-muted">{formatDateTime(item.createdAt)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <HistoryDrawer run={selectedRun} open={drawerOpen} initialSection={drawerSection} onClose={() => { setDrawerOpen(false); setDrawerSection(null); }} />

      {selectedScenario && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-slate-950/40" onClick={() => setSelectedScenario(null)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l bg-surface p-4">
            <div className="flex justify-between"><h3 className="text-lg font-semibold">Scenario {selectedScenario.ms_number}</h3><button onClick={() => setSelectedScenario(null)} className="rounded-lg border px-2 py-1 text-xs">Close</button></div>
            <div className="mt-4 space-y-2 rounded-xl border bg-bg/50 p-3 text-sm">
              <p><span className="text-muted">MS Number:</span> {selectedScenario.ms_number}</p>
              <p><span className="text-muted">Type:</span> {selectedScenario.scenario_type}{selectedScenario.full_switch ? " (Full Switch)" : ""}</p>
              <p><span className="text-muted">Current:</span> {selectedScenario.current_part || "All"}</p>
              <p><span className="text-muted">Target:</span> {selectedScenario.target_part || "-"}</p>
              <p><span className="text-muted">Region/Market:</span> {selectedScenario.purchase_region} / {selectedScenario.usage_market}</p>
              <p><span className="text-muted">Created:</span> {formatDateTime(selectedScenario.created_at)}</p>
            </div>
            <div className="mt-4">
              <Button onClick={() => navigate(`/app/m3/business-case?ms=${encodeURIComponent(selectedScenario.ms_number)}&bc_id=${selectedScenario.id}`)}>Open business case</Button>
            </div>
          </aside>
        </div>
      )}

      {taskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-950/40" onClick={() => setTaskModal(null)} />
          <div className="relative w-full max-w-lg rounded-2xl border bg-surface p-4">
            <div className="flex justify-between"><h3 className="text-lg font-semibold">Task activity</h3><button onClick={() => setTaskModal(null)} className="rounded-lg border px-2 py-1 text-xs">Close</button></div>
            <div className="mt-3 space-y-2 text-sm"><p className="font-medium">{taskModal.title}</p><p className="text-muted">{taskModal.subtitle}</p><p className="text-xs text-muted">{formatDateTime(taskModal.createdAt)}</p></div>
          </div>
        </div>
      )}
    </motion.div>
  );
}