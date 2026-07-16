import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Search, ShieldCheck, ShieldX, UserCog, Users, X } from "lucide-react";
import { ToastInline } from "../../components/ui/ToastInline";
import { cn } from "../../lib/cn";
import { authApi } from "../../services/authApi";

type AccessRole = "Admin" | "Role 3" | "Role 2" | "Role 1";
type AccessStatus = "Active" | "Suspended" | "Revoked";
type AccessRow = {
  id: string;
  name: string;
  email: string;
  role: AccessRole;
  status: AccessStatus;
  lastUpdated: string;
};

type RoleFilter = "All" | AccessRole;
type StatusFilter = "All" | AccessStatus;
type DialogMode = "view" | "edit-role" | null;

const ROLE_FILTERS: RoleFilter[] = ["All", "Admin", "Role 3", "Role 2", "Role 1"];
const STATUS_FILTERS: StatusFilter[] = ["All", "Active", "Suspended", "Revoked"];
const ROLE_OPTIONS: AccessRole[] = ["Admin", "Role 3", "Role 2", "Role 1"];

// Mapping des rôles Django vers l'affichage
const mapRoleToDisplay = (role: string): AccessRole => {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'ROLE_1') return 'Role 1';
  if (role === 'ROLE_2') return 'Role 2';
  if (role === 'ROLE_3') return 'Role 3';
  return 'Role 3';
};

// Mapping des rôles d'affichage vers Django
const mapDisplayToRole = (displayRole: AccessRole): string => {
  if (displayRole === 'Admin') return 'ADMIN';
  if (displayRole === 'Role 1') return 'ROLE_1';
  if (displayRole === 'Role 2') return 'ROLE_2';
  return 'ROLE_3';
};

function statusClass(status: AccessStatus) {
  if (status === "Active") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "Suspended") return "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "border-slate-500/35 bg-slate-500/10 text-slate-700 dark:text-slate-300";
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

export default function AdminAccessPermissionsPage() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [draftRole, setDraftRole] = useState<AccessRole>("Role 3");
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Charger les utilisateurs depuis l'API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await authApi.getAdminUsers();
      if (response.success && response.data) {
        const users = response.data.map((user: any) => ({
          id: String(user.id),
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: mapRoleToDisplay(user.role),
          status: user.is_active ? "Active" : "Suspended",
          lastUpdated: formatDate(user.updated_at),
        }));
        setRows(users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setToast({ type: "error", message: "Failed to load users" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedRowId) ?? null, [rows, selectedRowId]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== "All" && row.role !== roleFilter) return false;
      if (statusFilter !== "All" && row.status !== statusFilter) return false;
      if (!query) return true;
      return `${row.name} ${row.email} ${row.role} ${row.status}`.toLowerCase().includes(query);
    });
  }, [roleFilter, rows, search, statusFilter]);

  const summary = useMemo(() => {
    const active = rows.filter((row) => row.status === "Active").length;
    const role3 = rows.filter((row) => row.role === "Role 3").length;
    const admins = rows.filter((row) => row.role === "Admin").length;
    const suspended = rows.filter((row) => row.status === "Suspended" || row.status === "Revoked").length;

    return [
      { label: "Active users", value: String(active), icon: Users },
      { label: "Role 3 users", value: String(role3), icon: UserCog },
      { label: "Admins", value: String(admins), icon: ShieldCheck },
      { label: "Suspended / revoked", value: String(suspended), icon: ShieldX },
    ] as const;
  }, [rows]);

  useEffect(() => {
    if (!selectedRow || dialogMode !== "edit-role") return;
    setDraftRole(selectedRow.role);
  }, [dialogMode, selectedRow]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!dialogMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDialogMode(null);
        setSelectedRowId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogMode]);

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedRowId(null);
  };

  const openDialog = (rowId: string, mode: Exclude<DialogMode, null>) => {
    setSelectedRowId(rowId);
    setDialogMode(mode);
  };

  const handleSaveRole = async () => {
    if (!selectedRow) return;
    
    try {
      const djangoRole = mapDisplayToRole(draftRole);
      const response = await authApi.updateUserRole(parseInt(selectedRow.id), djangoRole);
      
      if (response.success) {
        // Mettre à jour localement
        setRows((current) =>
          current.map((row) =>
            row.id === selectedRow.id
              ? { ...row, role: draftRole, lastUpdated: formatDate(new Date().toISOString()) }
              : row
          )
        );
        setToast({ type: "success", message: `Role updated for ${selectedRow.name}` });
        closeDialog();
      } else {
        throw new Error(response.error?.message || "Failed to update role");
      }
    } catch (error: any) {
      setToast({ type: "error", message: error.message || "Failed to update role" });
    }
  };

  const handleToggleStatus = async (row: AccessRow) => {
    const newStatus = row.status === "Active" ? "Suspended" : "Active";
    
    try {
      const response = await authApi.toggleUserActive(parseInt(row.id));
      
      if (response.success) {
        setRows((current) =>
          current.map((r) =>
            r.id === row.id
              ? { ...r, status: newStatus as AccessStatus, lastUpdated: formatDate(new Date().toISOString()) }
              : r
          )
        );
        setToast({
          type: "info",
          message: newStatus === "Active" ? `${row.name} activated` : `${row.name} deactivated`,
        });
      } else {
        throw new Error(response.error?.message || "Failed to toggle status");
      }
    } catch (error: any) {
      setToast({ type: "error", message: error.message || "Failed to update status" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-surface px-5 py-4 shadow-premium">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <span className="inline-flex rounded-full border border-border/80 bg-bg/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Admin directory
            </span>
            <div className="space-y-1.5">
              <h2 className="text-[1.8rem] font-semibold tracking-tight text-text">Access & Permissions</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted">
                Manage approved users, assigned roles, and workspace access.
              </p>
            </div>
          </div>
          <button
            onClick={fetchUsers}
            className="inline-flex rounded-full border border-border bg-bg/80 px-3 py-1.5 text-xs font-medium text-muted shadow-sm hover:border-primary/35 hover:text-text transition"
          >
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((card, index) => (
          <article
            key={card.label}
            className="flex min-h-[132px] flex-col rounded-3xl border border-border bg-surface px-4 py-4 shadow-premium"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{card.label}</p>
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-2xl border",
                  index === 0 && "border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-300",
                  index === 1 && "border-primary/20 bg-primary/8 text-primary",
                  index === 2 && "border-sky-500/20 bg-sky-500/8 text-sky-600 dark:text-sky-300",
                  index === 3 && "border-amber-500/20 bg-amber-500/8 text-amber-700 dark:text-amber-300"
                )}
              >
                <card.icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-6 space-y-1">
              <p className="text-3xl font-semibold tracking-tight text-text">{card.value}</p>
              <p className="text-sm text-muted">Current directory snapshot</p>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4 shadow-premium">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text">User access directory</h3>
            <p className="text-sm text-muted">Review current roles, approval state, and workspace access.</p>
          </div>
          <div className="w-full xl:max-w-[340px]">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Search directory
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email..."
                className="h-11 w-full rounded-2xl border border-border bg-bg/80 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-muted hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-bg/45 p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Role filter</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLE_FILTERS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    roleFilter === role
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted hover:border-primary/30 hover:text-text"
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-bg/45 p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Access status</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    statusFilter === status
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted hover:border-primary/30 hover:text-text"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-premium">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/35 text-left text-[11px] uppercase tracking-[0.16em] text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Access status</th>
                <th className="px-4 py-3 font-medium">Last updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-border/70 align-top transition-colors hover:bg-bg/25 last:border-b-0">
                  <td className="px-4 py-4 text-text">
                    <div className="space-y-0.5">
                      <p className="font-medium text-text">{row.name}</p>
                      <p className="text-xs text-muted">{row.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-text">{row.email}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full border border-border bg-bg/70 px-2.5 py-1 text-xs font-medium text-text">
                      {row.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        "inline-flex min-w-[92px] items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium",
                        statusClass(row.status)
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted">{row.lastUpdated}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openDialog(row.id, "view")}
                        className="rounded-xl border border-border bg-bg/60 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:bg-bg"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openDialog(row.id, "edit-role")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg/60 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:bg-bg"
                      >
                        <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit role
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(row)}
                        className="rounded-xl border border-border bg-bg/60 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:bg-bg"
                      >
                        {row.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                    No users match the current filters.
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

      {selectedRow && dialogMode ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close access details"
            onClick={closeDialog}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-panel">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-flex rounded-full border border-border bg-bg/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                    {dialogMode === "view" ? "Access profile" : "Role assignment"}
                  </span>
                  <h3 className="text-lg font-semibold text-text">
                    {dialogMode === "view" ? "User details" : "Edit role"}
                  </h3>
                  <p className="text-sm text-muted">{selectedRow.name}</p>
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg/65 text-muted transition hover:border-primary/35 hover:text-text"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <section className="rounded-2xl border border-border bg-bg/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Profile</p>
                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusClass(selectedRow.status))}>
                    {selectedRow.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Full name</p>
                    <p className="text-sm font-medium text-text">{selectedRow.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Email</p>
                    <p className="text-sm text-text">{selectedRow.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Role</p>
                    <p className="text-sm text-text">{selectedRow.role}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Last updated</p>
                    <p className="text-sm text-muted">{selectedRow.lastUpdated}</p>
                  </div>
                </div>
              </section>

              {dialogMode === "edit-role" ? (
                <section className="rounded-2xl border border-border bg-bg/45 p-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Assigned role</p>
                    <p className="text-sm text-muted">Update the user workspace access level for this approved record.</p>
                  </div>
                  <select
                    id="access-role"
                    value={draftRole}
                    onChange={(event) => setDraftRole(event.target.value as AccessRole)}
                    className="mt-3 h-11 w-full rounded-2xl border border-border bg-bg/80 px-3 text-sm text-text outline-none transition-colors hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </section>
              ) : null}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-4">
              <button
                type="button"
                onClick={closeDialog}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-bg/70 px-4 text-sm text-text transition hover:border-primary/35"
              >
                Close
              </button>
              {dialogMode === "edit-role" ? (
                <button
                  type="button"
                  onClick={handleSaveRole}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-[0_8px_18px_rgba(22,103,240,0.3)] transition hover:brightness-110"
                >
                  Save role
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}