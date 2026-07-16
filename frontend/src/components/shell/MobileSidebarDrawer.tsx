import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";

interface MobileSidebarDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebarDrawer({ open, onClose }: MobileSidebarDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    const closeButton = panelRef.current?.querySelector<HTMLButtonElement>("[data-drawer-close]");
    closeButton?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            aria-label="Close sidebar drawer backdrop"
          />

          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            initial={{ x: -280, opacity: 0.7 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0.7 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="absolute left-0 top-0 h-full w-[264px] border-r border-border bg-surface shadow-panel"
          >
            <div className="flex items-center justify-end border-b border-border p-3">
              <button
                type="button"
                data-drawer-close
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <Sidebar onNavigate={onClose} />
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
