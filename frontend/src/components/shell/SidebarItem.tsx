import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/cn";

interface SidebarItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  onNavigate?: () => void;
}

export function SidebarItem({ to, label, icon: Icon, onNavigate }: SidebarItemProps) {
  return (
    <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
      <NavLink
        to={to}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            isActive
              ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(21,98,224,0.18)]"
              : "text-muted hover:bg-bg hover:text-text"
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive ? (
              <motion.span
                layoutId="sidebar-active-indicator"
                className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                aria-hidden="true"
              />
            ) : null}
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </>
        )}
      </NavLink>
    </motion.div>
  );
}
