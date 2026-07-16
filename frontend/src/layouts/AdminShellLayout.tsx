import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Menu,
  ScrollText,
  KeyRound,
  Shield,
  Users,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../lib/authSession";
import { cn } from "../lib/cn";
import { ThemeToggle } from "../components/ui/ThemeToggle";

const ADMIN_NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/user-requests", label: "User Requests", icon: Users },
  { to: "/admin/access-permissions", label: "Access & Permissions", icon: KeyRound },
  { to: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { to: "/app/m3/dashboard", label: "User Workspace", icon: Shield },
] as const;

function resolveTitle(pathname: string) {
  if (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/user-requests")) return "User Requests";
  if (pathname.startsWith("/admin/access-permissions")) return "Access & Permissions";
  if (pathname.startsWith("/admin/audit-log")) return "Audit Log";
  return "Dashboard";
}

interface AdminShellLayoutProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AdminShellLayout({ theme, onToggleTheme }: AdminShellLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const [collapsed, setCollapsed] = useState(false);
  const pageTitle = useMemo(() => resolveTitle(location.pathname), [location.pathname]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(33,96,196,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.18),transparent_34%),var(--color-bg)] text-text">
      <div
        className={cn(
          "grid min-h-screen",
          collapsed ? "grid-cols-[74px_1fr]" : "grid-cols-[220px_1fr]"
        )}
      >
        <aside
          className={cn(
            "flex min-h-screen flex-col border-r border-border/80 bg-surface/95 shadow-[inset_-1px_0_0_rgba(148,163,184,0.06)] backdrop-blur transition-all duration-200",
            collapsed ? "w-[74px]" : "w-[220px]"
          )}
        >
          <div className="border-b border-border/80 px-4 py-5">
            <p className={cn("text-[11px] font-semibold tracking-[0.2em] text-muted", collapsed && "sr-only")}>
              ADMIN CONSOLE
            </p>
            <p className={cn("mt-1 text-sm font-semibold tracking-[0.08em] text-text", collapsed && "sr-only")}>LEONI</p>
            {collapsed ? (
              <p className="text-center text-sm font-semibold tracking-[0.08em] text-text" aria-hidden="true">
                AC
              </p>
            ) : null}
          </div>

          <nav className="space-y-1.5 px-2 py-4">
            {ADMIN_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-sm transition-all",
                    isActive
                      ? "border-primary/30 bg-primary/12 text-primary shadow-[0_10px_24px_rgba(22,103,240,0.12)]"
                      : "border-transparent text-muted hover:border-border/80 hover:bg-bg/45 hover:text-text",
                    collapsed && "justify-center px-2"
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={cn(collapsed && "sr-only")}>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-border/70 px-3 pb-5 pt-4">
            <div className={cn("rounded-2xl border border-border/70 bg-bg/40 px-3 py-3", collapsed && "border-none bg-transparent p-0")}>
              <p className={cn("text-[11px] font-medium uppercase tracking-[0.16em] text-muted", collapsed && "sr-only")}>Environment</p>
              <p className={cn("mt-1 text-xs text-muted", collapsed && "sr-only")}>Mock admin mode</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/88 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCollapsed((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface/90 text-text shadow-sm hover:border-primary/35"
                  aria-label="Toggle admin sidebar"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Admin workspace</p>
                  <h1 className="text-lg font-semibold tracking-tight text-text">{pageTitle}</h1>
                  <p className="text-xs text-muted">{session?.email ?? "admin@leoni.com"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                <button
                  type="button"
                  onClick={() => {
                    clearSession();
                    navigate("/login", { replace: true });
                  }}
                  className="rounded-xl border border-border bg-surface/90 px-3.5 py-2 text-sm text-text shadow-sm hover:border-primary/35"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[1200px] rounded-[28px] border border-border/70 bg-bg/32 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:p-5">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
