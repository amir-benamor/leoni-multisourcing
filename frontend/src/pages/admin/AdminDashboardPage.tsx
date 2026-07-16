import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Eye,
  FileWarning,
  KeyRound,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/cn";
import { authApi } from "../../services/authApi";

type Severity = "Info" | "Warning" | "Critical";

type ActivityItem = {
  id: string;
  time: string;
  actor: string;
  action: string;
  entity: string;
  severity: Severity;
  notes: string;
};

type DashboardStats = {
  total_users: number;
  pending_approvals: number;
  new_users_last_month: number;
  active_users: number;
  users_by_role: {
    ROLE_1: number;
    ROLE_2: number;
    ROLE_3: number;
    ADMIN: number;
  };
};

function severityClass(severity: Severity) {
  if (severity === "Critical") return "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (severity === "Warning") return "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  // Charger les statistiques du dashboard
  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await authApi.getAdminStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Charger l'activité récente (audit logs)
  const loadRecentActivity = async () => {
    try {
      const response = await authApi.getAuditLogs({ timeRange: "24h" });
      if (response.success && response.data) {
        // Prendre les 6 derniers événements pour l'activité récente
        const recent = response.data.slice(0, 6).map((event: any) => ({
          id: event.id,
          time: new Date(event.ts).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          actor: event.actor,
          action: event.action,
          entity: event.entity.id,
          severity: event.severity as Severity,
          notes: event.meta?.notes || "No additional notes",
        }));
        setRecentActivity(recent);
      }
    } catch (error) {
      console.error("Error loading recent activity:", error);
    }
  };

  useEffect(() => {
    loadDashboardStats();
    loadRecentActivity();
  }, []);

  // Calculer les valeurs des KPI cards
  const kpiCards = [
    { 
      label: "Pending user requests", 
      value: stats?.pending_approvals?.toString() || "0", 
      helper: "Needs review", 
      to: "/admin/user-requests", 
      icon: UserCheck 
    },
    { 
      label: "Role 3 users", 
      value: stats?.users_by_role?.ROLE_3?.toString() || "0", 
      helper: "Monitor M3 workspace access", 
      to: "/admin/access-permissions", 
      icon: KeyRound 
    },
    { 
      label: "Suspended access", 
      value: (stats?.total_users && stats?.active_users 
        ? (stats.total_users - stats.active_users).toString() 
        : "0"), 
      helper: "Check user status", 
      to: "/admin/access-permissions", 
      icon: FileWarning 
    },
    { 
      label: "Total users", 
      value: stats?.total_users?.toString() || "0", 
      helper: "Registered users", 
      to: "/admin/access-permissions", 
      icon: ShieldCheck 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-surface px-5 py-4 shadow-premium">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl space-y-2">
            <span className="inline-flex rounded-full border border-border/80 bg-bg/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Admin overview
            </span>
            <div className="space-y-1.5">
              <h2 className="text-[1.8rem] font-semibold tracking-tight text-text">Admin Dashboard</h2>
              <p className="text-sm leading-6 text-muted">Monitor platform health, manage requests, and review access controls.</p>
            </div>
          </div>
          <button
            onClick={() => {
              loadDashboardStats();
              loadRecentActivity();
            }}
            className="inline-flex rounded-full border border-border bg-bg/80 px-3 py-1.5 text-xs font-medium text-muted shadow-sm hover:border-primary/35 hover:text-text transition"
          >
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card, index) => (
          <button
            key={card.label}
            type="button"
            onClick={() => navigate(card.to)}
            className="group flex min-h-[154px] cursor-pointer flex-col justify-between rounded-3xl border border-border bg-surface px-4 py-4 text-left shadow-premium transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-bg/35 active:translate-y-0"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{card.label}</p>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border",
                    index === 0 && "border-amber-500/20 bg-amber-500/8 text-amber-700 dark:text-amber-300",
                    index === 1 && "border-primary/20 bg-primary/8 text-primary",
                    index === 2 && "border-rose-500/20 bg-rose-500/8 text-rose-700 dark:text-rose-300",
                    index === 3 && "border-sky-500/20 bg-sky-500/8 text-sky-700 dark:text-sky-300"
                  )}
                >
                  <card.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted/80 transition group-hover:text-primary" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{card.value}</p>
              <p className="text-sm text-muted">{card.helper}</p>
            </div>
          </button>
        ))}
      </section>

      <section className="grid gap-3">
        <article className="rounded-3xl border border-border bg-surface p-4 shadow-premium">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text">Quick actions</h3>
            <p className="text-sm text-muted">Open the core admin workflows that need review today.</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <Button type="button" className="w-full px-4" onClick={() => navigate("/admin/user-requests")}>
              Review user requests
            </Button>
            <Button type="button" variant="secondary" className="w-full px-4" onClick={() => navigate("/admin/access-permissions")}>
              Open Access & Permissions
            </Button>
            <Button type="button" variant="secondary" className="w-full px-4" onClick={() => navigate("/admin/audit-log")}>
              Open Audit Log
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted/90">Tip: Approve requests before next snapshot import.</p>
        </article>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4 shadow-premium">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-text">Recent activity</h3>
          <p className="text-sm text-muted">Latest platform and access-control activity across the admin workspace.</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/35 text-left text-[11px] uppercase tracking-[0.16em] text-muted">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length > 0 ? (
                recentActivity.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 transition-colors hover:bg-bg/20">
                    <td className="px-4 py-4 text-text">{row.time}</td>
                    <td className="px-4 py-4 text-text">{row.actor}</td>
                    <td className="px-4 py-4 text-text">{row.action}</td>
                    <td className="px-4 py-4 font-mono text-xs text-muted">{row.entity}</td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex min-w-[92px] justify-center rounded-full border px-2.5 py-1 text-xs font-medium",
                          severityClass(row.severity)
                        )}
                      >
                        {row.severity}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedActivity(row)}
                        title="Open details"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg/65 text-muted transition hover:border-primary/35 hover:bg-bg hover:text-text"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Open details</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No recent activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedActivity ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close activity details"
            onClick={() => setSelectedActivity(null)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-border bg-surface p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="inline-flex rounded-full border border-border bg-bg/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                  Activity record
                </span>
                <h4 className="text-lg font-semibold text-text">Activity details</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="rounded-xl border border-border bg-bg/70 px-3 py-1.5 text-xs text-muted hover:border-primary/35 hover:text-text"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-2 rounded-2xl border border-border bg-bg/45 p-4 text-sm">
              <p><span className="text-muted">id:</span> {selectedActivity.id}</p>
              <p><span className="text-muted">timestamp:</span> {new Date().toISOString()}</p>
              <p><span className="text-muted">actor:</span> {selectedActivity.actor}</p>
              <p><span className="text-muted">action:</span> {selectedActivity.action}</p>
              <p><span className="text-muted">entity:</span> {selectedActivity.entity}</p>
              <p><span className="text-muted">severity:</span> {selectedActivity.severity}</p>
              <p><span className="text-muted">notes:</span> {selectedActivity.notes}</p>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" className="w-auto px-4" onClick={() => setSelectedActivity(null)}>
                Close
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}