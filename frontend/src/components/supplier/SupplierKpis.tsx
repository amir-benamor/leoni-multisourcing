import { motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import { cn } from "../../lib/cn";
import type { SupplierKpi } from "../../data/mockSupplierDetail";

interface SupplierKpisProps {
  items: SupplierKpi[];
}

function Ring({ progress }: { progress: number }) {
  const radius = 16;
  const circle = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(100, progress));

  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden="true">
      <circle cx="20" cy="20" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-primary/15" />
      <motion.circle
        cx="20"
        cy="20"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
        className="text-primary"
        initial={{ strokeDashoffset: circle }}
        animate={{ strokeDashoffset: circle * (1 - safe / 100) }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        strokeDasharray={circle}
      />
    </svg>
  );
}

export function SupplierKpis({ items }: SupplierKpisProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Supplier KPIs">
      {items.map((item, index) => (
        <motion.article
          key={item.key}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.24, delay: reduceMotion ? 0 : index * 0.05 }}
          whileHover={reduceMotion ? undefined : { y: -2 }}
          className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-text">{item.value}</p>
              {item.key === "savings" ? (
                <span
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted"
                  title="Estimated (SAP price list × IBP/LTF volumes)"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  Estimated (SAP price list x IBP/LTF volumes)
                </span>
              ) : null}
            </div>
            <Ring progress={item.progress} />
          </div>
          <span
            className={cn(
              "mt-3 inline-flex rounded-full border px-2 py-1 text-xs font-medium",
              item.delta.startsWith("+")
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300"
            )}
          >
            {item.delta}
          </span>
        </motion.article>
      ))}
    </section>
  );
}
