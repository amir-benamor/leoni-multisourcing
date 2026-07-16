import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "../../lib/cn";

function ActionButton({
  label,
  icon,
  onClick,
  compact = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface text-xs font-medium text-text shadow-sm transition-colors hover:border-primary/35 hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        compact ? "h-9 w-9 justify-center" : "h-9 gap-2 px-3"
      )}
      aria-label={label}
      title={label}
    >
      {icon}
      {!compact ? <span>{label}</span> : null}
    </motion.button>
  );
}

interface ExportActionsProps {
  compact?: boolean;
}

export function ExportActions({ compact = false }: ExportActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <ActionButton
        label="Export Excel"
        compact={compact}
        icon={<FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />}
        onClick={() => console.info("Export Excel (mock)")}
      />
      <ActionButton
        label="Export PDF"
        compact={compact}
        icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
        onClick={() => console.info("Export PDF (mock)")}
      />
    </div>
  );
}
