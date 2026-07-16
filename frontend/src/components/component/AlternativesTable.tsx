import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import { AlternativePart, OEMDetail } from "../../services/alternativeApi";

const compatibilityMeta: Record<string, { label: string; className: string }> = {
  "compatible": {
    label: "Compatible",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  "compatible-interface": {
    label: "Compatible interface",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
};

const oemStatusMeta: Record<string, string> = {
  "Released": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "Not released": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function formatUnitPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

type PopoverPosition = {
  top: number;
  left: number;
  placement: "top" | "bottom";
};

function OemReleasePopover({ details, total, released }: { details: OEMDetail[]; total: number; released: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const popoverWidth = 288;
  const popoverHeightEstimate = 240;

  const notReleasedCount = total - released;

  const updatePosition = () => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const belowSpace = viewportHeight - rect.bottom;
    const aboveSpace = rect.top;
    const placement: "top" | "bottom" =
      belowSpace < popoverHeightEstimate && aboveSpace > belowSpace ? "top" : "bottom";

    const preferredLeft = rect.right - popoverWidth;
    const left = Math.min(Math.max(12, preferredLeft), viewportWidth - popoverWidth - 12);
    const top = placement === "bottom" ? rect.bottom + 8 : Math.max(12, rect.top - popoverHeightEstimate - 8);

    setPosition({ top, left, placement });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleReposition = () => updatePosition();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-full border border-border bg-bg/75 px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {released}/{total} OEMs released
      </button>

      {isOpen && position
        ? createPortal(
            <div
              ref={popoverRef}
              className="fixed z-[90] w-72 rounded-2xl border border-border bg-surface p-3 shadow-panel"
              style={{ top: position.top, left: position.left }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">OEM release status</p>
              <p className="mt-1 text-xs text-muted">
                {released} released / {notReleasedCount} not released
              </p>

              <div className="mt-2.5 space-y-1.5">
                {details.map((entry) => (
                  <div
                    key={entry.oem}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-bg/35 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-text">{entry.oem}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", oemStatusMeta[entry.status] || "")}>
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

interface AlternativesTableProps {
  alternatives: AlternativePart[];
  currentPartNumber: string;
  targetPartNumber: string | null;
  onTargetChange: (partNumber: string) => void;
}

export function AlternativesTable({
  alternatives,
  currentPartNumber,
  targetPartNumber,
  onTargetChange,
}: AlternativesTableProps) {
  const currentPrice = useMemo(() => {
    const current = alternatives.find((p) => p.leoni_part_number === currentPartNumber);
    return current?.unit_price ?? null;
  }, [alternatives, currentPartNumber]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-border bg-bg/20 text-left text-[11px] uppercase tracking-[0.16em] text-muted">
          <tr>
            <th className="px-4 py-3.5 font-medium">Supplier</th>
            <th className="px-4 py-3.5 font-medium">Part Number</th>
            <th className="px-4 py-3.5 font-medium">Compatibility</th>
            <th className="px-4 py-3.5 font-medium">OEM release</th>
            <th className="px-4 py-3.5 font-medium">Unit price</th>
            <th className="px-4 py-3.5 font-medium">Delta vs current</th>
            <th className="px-4 py-3.5 text-center font-medium">Select target</th>
          </tr>
        </thead>

        <tbody>
          {alternatives.map((part, index) => {
            const isCurrent = part.leoni_part_number === currentPartNumber;
            const isSelectedTarget = targetPartNumber === part.leoni_part_number;
            const priceRange = part.price_range;
            const selectedRegionPrice = part.unit_price;
            const delta =
              currentPrice === null || selectedRegionPrice === null ? null : selectedRegionPrice - currentPrice;

            const compClass = compatibilityMeta[part.compatibility_status || ""] || {
              label: part.compatibility_status || "-",
              className: "",
            };

            return (
              <motion.tr
                key={part.leoni_part_number}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={cn(
                  "border-b border-border/70 last:border-b-0",
                  isCurrent
                    ? "bg-primary/[0.075]"
                    : isSelectedTarget
                      ? "bg-blue-500/[0.08]"
                      : "hover:bg-bg/45"
                )}
              >
                <td className="px-4 py-3.5 font-medium align-middle">{part.supplier_group}</td>
                <td className="px-4 py-3.5 align-middle">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs sm:text-sm">{part.leoni_part_number}</span>
                    {isCurrent ? (
                      <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary">
                        Current
                      </span>
                    ) : null}
                    {isSelectedTarget ? (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        Selected target
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3.5 align-middle">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      compClass.className
                    )}
                  >
                    {compClass.label}
                  </span>
                </td>
                <td className="px-4 py-3.5 align-middle">
                  <OemReleasePopover
                    details={part.oem_summary.details}
                    total={part.oem_summary.total}
                    released={part.oem_summary.released}
                  />
                </td>
                <td className="px-4 py-3.5 align-top text-right">
                  <div className="tabular-nums">
                    <p className="font-medium text-text">
                      {selectedRegionPrice === null || selectedRegionPrice === undefined
                        ? "No price in selected region"
                        : formatUnitPrice(selectedRegionPrice)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Range: {formatUnitPrice(priceRange.min)} - {formatUnitPrice(priceRange.max)}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3.5 align-top text-right">
                  <div className="font-medium tabular-nums text-text">
                    {delta === null
                      ? "No price in selected region"
                      : delta === 0
                        ? formatUnitPrice(0)
                        : `${delta > 0 ? "+" : ""}${formatUnitPrice(Math.abs(delta))}`}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center align-middle">
                  <input
                    type="radio"
                    name="target-part"
                    value={part.leoni_part_number}
                    checked={targetPartNumber === part.leoni_part_number}
                    onChange={() => onTargetChange(part.leoni_part_number)}
                    disabled={isCurrent}
                    aria-label={`Set ${part.leoni_part_number} as target`}
                    className="h-4 w-4 accent-primary disabled:cursor-not-allowed"
                  />
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}