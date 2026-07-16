import {
  ArrowLeftCircle,
  Shield,
  BadgeEuro,
  Boxes,
  Calculator,
  ChevronDown,
  ChevronRight,
  History,
  LayoutDashboard,
  Layers3,
  type LucideIcon,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { getSession, isUserRole, type UserRole } from "../../lib/authSession";
import { cn } from "../../lib/cn";
import { SidebarItem } from "./SidebarItem";

interface SidebarProps {
  onNavigate?: () => void;
}

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type GroupedNavItem = {
  type: "group";
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

type FlatNavItem = {
  type: "item";
  item: NavItem;
};

type RenderableNavItem = FlatNavItem | GroupedNavItem;

const NAV_ITEMS_BY_ROLE: Record<UserRole, readonly RenderableNavItem[]> = {
  role1: [
    { type: "item", item: { to: "/app/m1", label: "M1 · Parts Data", icon: Layers3 } },
    { type: "item", item: { to: "/app/history", label: "History", icon: History } },
    { type: "item", item: { to: "/app/settings", label: "Settings", icon: Settings } },
  ],
  role2: [
    { type: "item", item: { to: "/app/m1", label: "M1 · Parts Data", icon: Layers3 } },
    { type: "item", item: { to: "/app/m2", label: "M2 · Parts Commercial Data", icon: BadgeEuro } },
    { type: "item", item: { to: "/app/history", label: "History", icon: History } },
    { type: "item", item: { to: "/app/settings", label: "Settings", icon: Settings } },
  ],
  role3: [
    { type: "item", item: { to: "/app/m1", label: "M1 · Parts Data", icon: Layers3 } },
    { type: "item", item: { to: "/app/m2", label: "M2 · Parts Commercial Data", icon: BadgeEuro } },
    {
      type: "group",
      label: "M3 Multisourcing",
      icon: LayoutDashboard,
      items: [
        { to: "/app/m3/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/app/m3/explore", label: "Explore / Status", icon: Search },
        { to: "/app/m3/component", label: "Part Alternative Analysis", icon: Boxes },
        { to: "/app/m3/business-case", label: "Business Case", icon: Calculator },
      ],
    },
    { type: "item", item: { to: "/app/import", label: "Import Data", icon: Upload } },
    { type: "item", item: { to: "/app/history", label: "History", icon: History } },
    { type: "item", item: { to: "/app/settings", label: "Settings", icon: Settings } },
  ],
};

const FALLBACK_NAV_ITEMS: readonly RenderableNavItem[] = [
  { type: "item", item: { to: "/app/history", label: "History", icon: History } },
  { type: "item", item: { to: "/app/settings", label: "Settings", icon: Settings } },
];

export function Sidebar({ onNavigate }: SidebarProps) {
  const session = getSession();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["M3 Multisourcing"]));

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const navItems =
    session?.role === "admin"
      ? NAV_ITEMS_BY_ROLE.role3
      : session && isUserRole(session.role)
        ? NAV_ITEMS_BY_ROLE[session.role]
        : FALLBACK_NAV_ITEMS;

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-border px-5 py-5">
        <p className="text-[10px] font-semibold tracking-[0.24em] text-muted">MULTISOURCING PLATFORM</p>
        <p className="mt-1 text-sm font-medium text-text">LEONI</p>
        {session?.role === "admin" ? (
          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Shield className="h-3 w-3" aria-hidden="true" />
              Admin in user workspace
            </span>
          </div>
        ) : null}
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item, index) => {
          if (item.type === "item") {
            return (
              <SidebarItem
                key={item.item.to}
                to={item.item.to}
                label={item.item.label}
                icon={item.item.icon}
                onNavigate={onNavigate}
              />
            );
          }

          // Grouped item
          const isOpen = openGroups.has(item.label);
          return (
            <div key={`group-${index}`} className="space-y-1">
              <button
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  "text-muted hover:bg-bg hover:text-text",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {isOpen && (
                <div className="ml-4 space-y-1 border-l border-border pl-2">
                  {item.items.map((subItem) => (
                    <SidebarItem
                      key={subItem.to}
                      to={subItem.to}
                      label={subItem.label}
                      icon={subItem.icon}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {session?.role === "admin" ? (
        <div className="border-t border-border px-3 py-4">
          <NavLink
            to="/admin/dashboard"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                isActive
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-border/80 text-muted hover:border-primary/25 hover:bg-bg hover:text-text"
              )
            }
          >
            <ArrowLeftCircle className="h-4 w-4" aria-hidden="true" />
            <span>Back to Admin Console</span>
          </NavLink>
        </div>
      ) : null}
    </div>
  );
}