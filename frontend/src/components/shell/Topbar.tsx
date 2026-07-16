import { LogOut, Menu, FileText } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";
import { getSession, isUserRole, type UserRole } from "../../lib/authSession";
import { useFilters } from "../../context/FiltersContext";
import { ThemeToggle } from "../ui/ThemeToggle";
import { GlobalFilters } from "./GlobalFilters";
import { useExportPdf } from "../../services/useExportPdf";

interface TopbarProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
}

function isRouteInNamespace(pathname: string, namespace: string) {
  return pathname === namespace || pathname.startsWith(`${namespace}/`);
}

function resolveModuleContext(pathname: string) {
  if (pathname === "/app/m1") return "M1 Entry";
  if (pathname.startsWith("/app/m1/parts")) return "Parts List";
  if (pathname.startsWith("/app/m1/part")) return "One Part";
  if (pathname.startsWith("/app/m1/material-group")) return "Material Group";
  if (pathname === "/app/m2") return "M2 Entry";
  if (pathname.startsWith("/app/m2/parts")) return "Parts List";
  if (pathname.startsWith("/app/m2/part")) return "One Part";
  if (pathname.startsWith("/app/m2/material-group")) return "Material Group";
  if (pathname.startsWith("/app/m2/supplier")) return "Supplier Analysis";
  return null;
}

function resolveRoleLabel(role: UserRole) {
  if (role === "role1") return "Role 1";
  if (role === "role2") return "Role 2";
  return "Role 3";
}

function getInitials(session: ReturnType<typeof getSession>): string {
  if (!session) return "U";
  
  const maybeNamedSession = session as typeof session & { firstName?: string; lastName?: string; fullName?: string };
  const fullName = maybeNamedSession.fullName?.trim();
  if (fullName) {
    const parts = fullName.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  
  const firstName = maybeNamedSession.firstName?.trim();
  const lastName = maybeNamedSession.lastName?.trim();
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }
  if (firstName) return firstName[0].toUpperCase();
  if (lastName) return lastName[0].toUpperCase();
  
  const email = session.email?.trim();
  if (email) {
    return email[0].toUpperCase();
  }
  
  return "U";
}

export function Topbar({ theme, onToggleTheme, onOpenSidebar }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, setFilters, reset } = useFilters();
  const session = getSession();
  const { exportToPdf } = useExportPdf();
  const isM1Route = isRouteInNamespace(location.pathname, "/app/m1");
  const isM2Route = isRouteInNamespace(location.pathname, "/app/m2");
  const isLightweightModuleRoute = isM1Route || isM2Route;
  const moduleContext = resolveModuleContext(location.pathname);
  const userRoleLabel = session && isUserRole(session.role) ? resolveRoleLabel(session.role) : null;
  const userEmail = session?.email || "";
  const userInitials = getInitials(session);
  
  const showExportOnPages = [
    "/app/m1",
    "/app/m2",
    "/app/explore",
    "/app/status",
    "/app/ms",
    "/app/m3",
    "/app/business-case"
  ].some((route) => location.pathname.startsWith(route));
  
  const hideExportPages = ["/app/dashboard", "/app/import", "/app/history", "/app/settings"].some((route) =>
    location.pathname.startsWith(route)
  );
  
  const showExportPDF = showExportOnPages && !hideExportPages;
  
  const scopeDisabled = ["/app/import", "/app/history", "/app/settings"].some((route) =>
    location.pathname.startsWith(route)
  );
  const hideScopeControls = scopeDisabled || isLightweightModuleRoute;

  const avatarColors = [
    "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "bg-rose-500/10 text-rose-600 border-rose-500/20",
    "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  ];
  const colorIndex = userInitials.charCodeAt(0) % avatarColors.length;
  const avatarColorClass = avatarColors[colorIndex];

  const handleExportPDF = () => {
    const pagePath = location.pathname.replace(/\/app\//, '').replace(/\//g, '-');
    const filename = `${pagePath}-${new Date().toISOString().slice(0, 10)}.pdf`;
    exportToPdf('export-content', filename);
  };

  return (
    <div className="flex flex-col gap-2 px-3 py-2 sm:px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
              avatarColorClass
            )}
          >
            {userInitials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted">
              {userEmail || "No email"}
            </p>
          </div>
        </div>

        {hideScopeControls ? (
          <span
            title={
              isLightweightModuleRoute
                ? "Module-specific consultation view."
                : "Scope filters are disabled on this page."
            }
            className="hidden rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 lg:inline-flex"
          >
            {isM1Route ? "M1 view" : isM2Route ? "M2 view" : "Scope disabled"}
          </span>
        ) : null}
        {isLightweightModuleRoute && moduleContext ? (
          <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary lg:inline-flex">
            {moduleContext}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-muted lg:inline">Last import: 2026-02-23 09:15</span>

          {showExportPDF && (
            <button
              onClick={handleExportPDF}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs text-text transition-colors hover:border-primary/35 hover:bg-bg"
            >
              <FileText className="h-3.5 w-3.5" />
              Export PDF
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/login")}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full border border-border bg-surface text-text",
              "transition-colors hover:border-primary/35 hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              "w-9 sm:w-auto sm:gap-2 sm:px-3"
            )}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden text-xs font-medium sm:inline">Sign out</span>
          </button>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      <div
        className={hideScopeControls ? "opacity-45 pointer-events-none select-none" : undefined}
        aria-disabled={hideScopeControls ? "true" : "false"}
        title={
          isLightweightModuleRoute
            ? "Global scope filters are hidden on lightweight module pages."
            : scopeDisabled
            ? "Scope filters are disabled on this page."
            : undefined
        }
      >
        {isLightweightModuleRoute ? null : (
          <GlobalFilters filters={filters} setFilters={setFilters} onReset={reset} disabled={scopeDisabled} />
        )}
      </div>
    </div>
  );
}