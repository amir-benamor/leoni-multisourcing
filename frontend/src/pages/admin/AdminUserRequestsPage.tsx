import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Check, Eye, Search, X } from "lucide-react";
import { ToastInline } from "../../components/ui/ToastInline";
import { cn } from "../../lib/cn";
import { authApi } from "../../services/authApi";

type RequestStatus = "Pending" | "Approved" | "Rejected";

type UserRequest = {
  id: string;
  requestedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  requestedRole: string;
  finalRole?: string;
  status: RequestStatus;
  adminNote?: string;
  rejectReason?: string;
};

type StatusFilter = "All" | RequestStatus;

const ROLE_OPTIONS = ["ROLE_1", "ROLE_2", "ROLE_3", "ADMIN"] as const;
const REJECT_REASONS = [
  "Not authorized",
  "Duplicate request",
  "Missing information",
  "Other",
] as const;

// Mapping des rôles Django vers l'affichage
const mapRoleToDisplay = (role: string): string => {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'ROLE_1') return 'Role 1';
  if (role === 'ROLE_2') return 'Role 2';
  if (role === 'ROLE_3') return 'Role 3';
  return role;
};

// Mapping des rôles d'affichage vers Django
const mapDisplayToRole = (displayRole: string): string => {
  if (displayRole === 'Admin') return 'ADMIN';
  if (displayRole === 'Role 1') return 'ROLE_1';
  if (displayRole === 'Role 2') return 'ROLE_2';
  if (displayRole === 'Role 3') return 'ROLE_3';
  return displayRole;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusBadgeClass(status: RequestStatus) {
  if (status === "Approved") return "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "Rejected") return "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export default function AdminUserRequestsPage() {
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [drawerFinalRole, setDrawerFinalRole] = useState<string>(ROLE_OPTIONS[0]);
  const [drawerRejectReason, setDrawerRejectReason] = useState<string>(REJECT_REASONS[0]);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Charger les demandes depuis l'API
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await authApi.getPendingUsers();
      if (response.success && response.data) {
        const formattedRequests = response.data.map((user: any) => ({
          id: String(user.id),
          requestedAt: user.created_at,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          requestedRole: mapRoleToDisplay(user.role || 'ROLE_3'),
          status: user.is_approved ? "Approved" : "Pending" as RequestStatus,
          adminNote: user.admin_note,
        }));
        setRequests(formattedRequests);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      setToast({ type: "error", message: "Failed to load requests" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "Pending").length,
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesStatus = statusFilter === "All" || request.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      const fullName = `${request.firstName} ${request.lastName}`.toLowerCase();
      const haystack = `${fullName} ${request.email} ${request.requestedRole}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [requests, searchQuery, statusFilter]);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  useEffect(() => {
    if (!selectedRequest) return;
    // Ne pas utiliser finalRole s'il est undefined, utiliser requestedRole à la place
    const defaultRole = selectedRequest.finalRole || selectedRequest.requestedRole;
    setDrawerFinalRole(mapDisplayToRole(defaultRole) || ROLE_OPTIONS[0]);
    setDrawerRejectReason(selectedRequest.rejectReason ?? REJECT_REASONS[0]);
  }, [selectedRequest]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!selectedRequestId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedRequestId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedRequestId]);

  const approveRequest = async (id: string, finalRole: string) => {
    try {
      const djangoRole = mapDisplayToRole(finalRole);
      const userId = parseInt(id);
      
      console.log('Approve request:', { userId, role: djangoRole });
      
      const response = await authApi.approveUser(userId, djangoRole);
      
      if (response.success) {
        setRequests((prev) =>
          prev.map((request) =>
            request.id === id
              ? { ...request, status: "Approved", finalRole, rejectReason: undefined }
              : request
          )
        );
        setToast({ type: "success", message: `Request approved with role ${finalRole}` });
        setSelectedRequestId(null);
        // Rafraîchir la liste après 2 secondes
        setTimeout(() => fetchRequests(), 2000);
      } else {
        const errorMsg = response.error?.message || response.error?.error || "Approval failed";
        setToast({ type: "error", message: errorMsg });
      }
    } catch (error: any) {
      console.error("Approve error:", error);
      setToast({ type: "error", message: error.message || "Failed to approve" });
    }
  };

  const rejectRequest = async (id: string, reason: string) => {
    try {
      const userId = parseInt(id);
      const response = await authApi.rejectUser(userId, reason);
      
      if (response.success) {
        setRequests((prev) =>
          prev.map((request) =>
            request.id === id
              ? { ...request, status: "Rejected", rejectReason: reason, finalRole: undefined }
              : request
          )
        );
        setToast({ type: "error", message: "Request rejected" });
        setSelectedRequestId(null);
        setTimeout(() => fetchRequests(), 2000);
      } else {
        const errorMsg = response.error?.message || response.error?.error || "Rejection failed";
        setToast({ type: "error", message: errorMsg });
      }
    } catch (error: any) {
      console.error("Reject error:", error);
      setToast({ type: "error", message: error.message || "Failed to reject" });
    }
  };

  const updateNote = (id: string, note: string) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === id ? { ...request, adminNote: note.trim() || undefined } : request
      )
    );
    setToast({ type: "info", message: "Note saved locally" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-surface p-5 shadow-premium">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-border/80 bg-bg/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Request workflow
              </span>
              <span className="inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                {pendingCount} pending
              </span>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-[1.8rem] font-semibold tracking-tight text-text">User requests</h2>
              <p className="text-sm leading-6 text-muted">Review access requests, assign the final role, and close the approval flow.</p>
            </div>
          </div>
          <button
            onClick={fetchRequests}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-bg/70 px-4 text-sm text-text transition hover:border-primary/35"
          >
            Refresh
          </button>
          <div className="w-full xl:max-w-[340px]">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Search requests</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name or email..."
                className="h-11 w-full rounded-2xl border border-border bg-bg/80 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-muted hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border/80 bg-bg/45 p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Request status</p>
          <div className="mt-2 flex flex-wrap gap-2">
          {(["All", "Pending", "Approved", "Rejected"] as const).map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary/35 bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted hover:border-primary/30 hover:text-text"
                )}
              >
                {status}
              </button>
            );
          })}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-premium">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/35 text-left text-[11px] uppercase tracking-[0.16em] text-muted">
                <th className="px-4 py-3 font-medium">Requested at</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Requested role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id} className="border-b border-border/70 transition-colors hover:bg-bg/20 last:border-b-0">
                  <td className="px-4 py-4 text-text">{formatDateTime(request.requestedAt)}</td>
                  <td className="px-4 py-4 text-text">
                    <div className="space-y-0.5">
                      <p className="font-medium text-text">{request.firstName} {request.lastName}</p>
                      <p className="text-xs text-muted">{request.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-text">{request.email}</td>
                  <td className="px-4 py-4 text-text">{request.requestedRole}</td>
                  <td className="px-4 py-4">
                    <span className={cn("inline-flex min-w-[92px] justify-center rounded-full border px-2.5 py-1 text-xs font-medium", statusBadgeClass(request.status))}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRequestId(request.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg/65 text-muted transition hover:border-primary/35 hover:bg-bg hover:text-text"
                        title="View details"
                        aria-label="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {request.status === "Pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm("Approve this request?")) return;
                              approveRequest(request.id, request.requestedRole);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/8 text-emerald-600 hover:bg-emerald-500/12 dark:text-emerald-300"
                            title="Approve request"
                            aria-label="Approve request"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm("Reject this request?")) return;
                              rejectRequest(request.id, REJECT_REASONS[0]);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/8 text-rose-600 hover:bg-rose-500/12 dark:text-rose-300"
                            title="Reject request"
                            aria-label="Reject request"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                    No requests match your filters.
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

      {selectedRequest && selectedRequest.status === "Pending" ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close request details"
            onClick={() => setSelectedRequestId(null)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-panel">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-flex rounded-full border border-border bg-bg/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                    Request details
                  </span>
                  <h3 className="text-lg font-semibold text-text">Request {selectedRequest.id}</h3>
                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusBadgeClass(selectedRequest.status))}>
                    {selectedRequest.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequestId(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg/65 text-muted transition hover:border-primary/35 hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <section className="rounded-2xl border border-border bg-bg/45 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Identity</p>
                <p className="mt-2 text-sm font-medium text-text">{selectedRequest.firstName} {selectedRequest.lastName}</p>
                <p className="text-sm text-text">{selectedRequest.email}</p>
                <p className="mt-2 text-xs text-muted">Requested role: {selectedRequest.requestedRole}</p>
                <p className="text-xs text-muted">Requested at: {formatDateTime(selectedRequest.requestedAt)}</p>
              </section>

              <section className="space-y-3 rounded-2xl border border-border bg-bg/45 p-4">
                <div className="space-y-2">
                  <label htmlFor="final-role" className="block text-sm font-medium text-text">
                    Final role
                  </label>
                  <select
                    id="final-role"
                    value={drawerFinalRole}
                    onChange={(event) => setDrawerFinalRole(event.target.value as any)}
                    className="h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none transition-colors hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {mapRoleToDisplay(role)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="reject-reason" className="block text-sm font-medium text-text">
                    Reject reason
                  </label>
                  <select
                    id="reject-reason"
                    value={drawerRejectReason}
                    onChange={(event) => setDrawerRejectReason(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none transition-colors hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35"
                  >
                    {REJECT_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 pt-2">
                  <button
                    type="button"
                    onClick={() => approveRequest(selectedRequest.id, mapRoleToDisplay(drawerFinalRole))}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-[0_8px_18px_rgba(22,103,240,0.3)] transition hover:brightness-110"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm("Reject this request?")) return;
                      rejectRequest(selectedRequest.id, drawerRejectReason);
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-500/15 dark:text-rose-300"
                  >
                    Reject
                  </button>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 border-t border-border bg-surface px-5 py-4">
              <button
                type="button"
                onClick={() => setSelectedRequestId(null)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-bg/70 px-4 text-sm text-text transition hover:border-primary/35"
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}