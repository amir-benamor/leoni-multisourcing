import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Download,
  Eye,
  FileJson,
  Info,
  RefreshCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { ToastInline } from "../../components/ui/ToastInline";
import { cn } from "../../lib/cn";
import { authApi } from "../../services/authApi";

type Category = "admin" | "imports" | "master_data" | "auth" | "business_case";
type Severity = "Info" | "Warning" | "Critical";
type TimeRange = "24h" | "7d" | "30d";
type CategoryFilter = "all" | Category;

type AuditEvent = {
  id: string;
  ts: string;
  category: Category;
  actor: string;
  action: string;
  entity: { type: string; id: string };
  severity: Severity;
  meta: {
    ip: string;
    userAgent: string;
    source: string;
    requestId: string;
    notes?: string;
    diff?: string;
  };
};

const severityClass = (severity: Severity) =>
  severity === "Critical"
    ? "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    : severity === "Warning"
      ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300";

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

function exportCsv(filename: string, rows: string[][]) {
  const esc = (v: string) => (v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v);
  const content = rows.map((r) => r.map((c) => esc(c)).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function categoryLabel(filter: CategoryFilter) {
  if (filter === "all") return "All";
  if (filter === "admin") return "Admin actions";
  if (filter === "imports") return "Imports";
  if (filter === "master_data") return "Master data";
  if (filter === "business_case") return "Business Case";
  return "Auth";
}

export default function AdminAuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [severityFilters, setSeverityFilters] = useState<Severity[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toISOString());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await authApi.getAuditLogs({
        category: category !== 'all' ? category : undefined,
        severity: severityFilters.length === 1 ? severityFilters[0] : undefined,
        timeRange: timeRange,
      });
      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        setToast({ type: "error", message: "Failed to load audit logs" });
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setToast({ type: "error", message: "Failed to load audit logs" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [category, severityFilters, timeRange]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!selectedEventId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedEventId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEventId]);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      if (category !== "all" && event.category !== category) return false;
      if (severityFilters.length > 0 && !severityFilters.includes(event.severity)) return false;
      if (!query) return true;
      const haystack = `${event.actor} ${event.action} ${event.entity.type} ${event.entity.id}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [events, search, category, severityFilters]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const events24h = useMemo(
    () => events.filter((event) => Date.now() - new Date(event.ts).getTime() <= 24 * 60 * 60 * 1000),
    [events]
  );

  const kpis = useMemo(() => {
    const critical = events24h.filter((event) => event.severity === "Critical").length;
    const warnings = events24h.filter((event) => event.severity === "Warning").length;
    const actors = new Set(events24h.map((event) => event.actor)).size;
    return [
      { label: "Events (24h)", value: String(events24h.length), icon: Info },
      { label: "Critical", value: String(critical), icon: ShieldAlert },
      { label: "Warnings", value: String(warnings), icon: AlertTriangle },
      { label: "Unique actors", value: String(actors), icon: FileJson },
    ];
  }, [events24h]);

  const toggleSeverity = (severity: Severity) => {
    setSeverityFilters((prev) =>
      prev.includes(severity) ? prev.filter((item) => item !== severity) : [...prev, severity]
    );
  };

  const runRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await fetchEvents();
    setLastRefreshedAt(new Date().toISOString());
    setToast({ type: "info", message: "Audit events refreshed" });
    setIsRefreshing(false);
  };

  const exportList = () => {
    const rows: string[][] = [
      ["time", "event_id", "category", "actor", "action", "entity_type", "entity_id", "severity"],
      ...filteredEvents.map((event) => [event.ts, event.id, event.category, event.actor, event.action, event.entity.type, event.entity.id, event.severity]),
    ];
    exportCsv("admin_audit_log.csv", rows);
  };

  const exportEventJson = (event: AuditEvent) => {
    const blob = new Blob([JSON.stringify(event, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-surface p-5 shadow-premium">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-2">
            <span className="inline-flex rounded-full border border-border/80 bg-bg/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Control record
            </span>
            <div className="space-y-1.5">
              <h2 className="text-[1.8rem] font-semibold tracking-tight text-text">Audit Log</h2>
              <p className="text-sm leading-6 text-muted">Track admin actions and system events.</p>
              <p className="text-xs text-muted">Last refreshed: {formatDateTime(lastRefreshedAt)}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
            <div className="relative min-w-[300px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search actor, entity, action..."
                className="h-11 w-full rounded-2xl border border-border bg-bg/80 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-muted hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35"
              />
            </div>
            <button
              type="button"
              onClick={runRefresh}
              disabled={isRefreshing}
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-bg/70 px-4 text-sm text-text transition hover:border-primary/35",
                isRefreshing && "cursor-not-allowed opacity-70"
              )}
            >
              <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={exportList}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-white shadow-[0_8px_18px_rgba(22,103,240,0.3)] transition hover:brightness-110"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-border/80 bg-bg/45 p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Category</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {([
                { key: "all", label: "All" },
                { key: "admin", label: "Admin actions" },
                { key: "imports", label: "Imports" },
                { key: "master_data", label: "Master data" },
                { key: "auth", label: "Auth" },
                { key: "business_case", label: "Business Case" },
              ] as const).map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setCategory(chip.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    category === chip.key ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-surface text-muted hover:border-primary/35 hover:text-text"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-bg/45 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Severity</span>
              {(["Info", "Warning", "Critical"] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => toggleSeverity(sev)}
                  className={cn(
                    "rounded-full border px-2.5 py-1.5 text-xs transition-colors",
                    severityFilters.includes(sev) ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-surface text-muted hover:text-text"
                  )}
                >
                  {sev}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Range</span>
              {(["24h", "7d", "30d"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "rounded-full border px-2.5 py-1.5 text-xs transition-colors",
                    timeRange === range ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-surface text-muted hover:text-text"
                  )}
                >
                  {range === "24h" ? "Last 24h" : range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <article key={kpi.label} className="rounded-3xl border border-border bg-surface p-4 shadow-premium">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{kpi.label}</p>
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border",
                  index === 0 && "border-sky-500/20 bg-sky-500/8 text-sky-700 dark:text-sky-300",
                  index === 1 && "border-rose-500/20 bg-rose-500/8 text-rose-700 dark:text-rose-300",
                  index === 2 && "border-amber-500/20 bg-amber-500/8 text-amber-700 dark:text-amber-300",
                  index === 3 && "border-primary/20 bg-primary/8 text-primary"
                )}
              >
                <kpi.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight text-text">{kpi.value}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-premium">
        <div className="border-b border-border px-5 py-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text">Events • {categoryLabel(category)}</h3>
            <p className="text-sm text-muted">Filtered audit activity in the selected control window.</p>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-[920px] w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/35 text-left text-[11px] uppercase tracking-[0.16em] text-muted">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-b border-border/70 transition-colors hover:bg-bg/20 last:border-b-0">
                  <td className="px-4 py-4 text-text">{formatDateTime(event.ts)}</td>
                  <td className="px-4 py-4 text-text">{event.actor}</td>
                  <td className="px-4 py-4 text-text">{event.action}</td>
                  <td className="px-4 py-4 font-mono text-xs text-muted">{event.entity.id}</td>
                  <td className="px-4 py-4">
                    <span className={cn("inline-flex min-w-[92px] justify-center rounded-full border px-2.5 py-1 text-xs font-medium", severityClass(event.severity))}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        title="Open details"
                        aria-label="Open details"
                        onClick={() => setSelectedEventId(event.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg/65 text-muted transition hover:border-primary/35 hover:bg-bg hover:text-text"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted">
                    No events found for current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <AnimatePresence>
        {toast ? (
          <div className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))]">
            <ToastInline type={toast.type} message={toast.message} />
          </div>
        ) : null}
      </AnimatePresence>

      {selectedEvent ? (
        <div className="fixed inset-0 z-50">
          <button type="button" onClick={() => setSelectedEventId(null)} className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" aria-label="Close event details" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface shadow-panel">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-flex rounded-full border border-border bg-bg/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Audit event</span>
                  <h3 className="text-lg font-semibold text-text">Event {selectedEvent.id}</h3>
                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", severityClass(selectedEvent.severity))}>{selectedEvent.severity}</span>
                </div>
                <button type="button" onClick={() => setSelectedEventId(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg/65 text-muted transition hover:border-primary/35 hover:text-text">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <section className="rounded-2xl border border-border bg-bg/45 p-4">
                <h4 className="text-sm font-semibold text-text">Summary</h4>
                <div className="mt-3 space-y-1 text-sm text-muted">
                  <p><span className="text-text">Action:</span> {selectedEvent.action}</p>
                  <p><span className="text-text">Actor:</span> {selectedEvent.actor}</p>
                  <p><span className="text-text">Time:</span> {formatDateTime(selectedEvent.ts)}</p>
                </div>
              </section>
              <section className="rounded-2xl border border-border bg-bg/45 p-4">
                <h4 className="text-sm font-semibold text-text">Entity details</h4>
                <div className="mt-3 space-y-1 text-sm text-muted">
                  <p><span className="text-text">Type:</span> {selectedEvent.entity.type}</p>
                  <p><span className="text-text">ID:</span> {selectedEvent.entity.id}</p>
                </div>
              </section>
              <section className="rounded-2xl border border-border bg-bg/45 p-4">
                <h4 className="text-sm font-semibold text-text">Metadata</h4>
                <div className="mt-3 space-y-1 text-sm text-muted">
                  <p><span className="text-text">IP:</span> {selectedEvent.meta.ip}</p>
                  <p><span className="text-text">User agent:</span> {selectedEvent.meta.userAgent}</p>
                  <p><span className="text-text">Source:</span> {selectedEvent.meta.source}</p>
                  <p><span className="text-text">Request ID:</span> {selectedEvent.meta.requestId}</p>
                  <p><span className="text-text">Notes:</span> {selectedEvent.meta.notes ?? "-"}</p>
                  <p><span className="text-text">Diff:</span> {selectedEvent.meta.diff ?? "-"}</p>
                </div>
              </section>
            </div>
            <div className="flex items-center justify-between border-t border-border bg-surface px-5 py-4">
              <button type="button" onClick={() => exportEventJson(selectedEvent)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-bg/70 px-4 text-sm text-text transition hover:border-primary/35">
                <FileJson className="h-4 w-4" />
                Download event JSON
              </button>
              <button type="button" onClick={() => setSelectedEventId(null)} className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-[0_8px_18px_rgba(22,103,240,0.3)] transition hover:brightness-110">
                Close
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}