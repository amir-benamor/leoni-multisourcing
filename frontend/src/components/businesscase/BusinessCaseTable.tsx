import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { cn } from "../../lib/cn";

// ========== TYPES ==========

type OemDetail = {
  oem: string;
  status: "Released" | "Not released";
};

type BcTableRow = {
  reference: string;
  currentPn: string;
  currentSupplier: string;
  targetPn: string;
  targetSupplier: string;
  compatibility: string;
  oemDetails: OemDetail[];
  currentPrice: number;
  targetPrice: number;
  deltaPrice: number;
  totalAnnualVolume: number;
  annualSaving: number;
};

type TableTab = "all" | "highest-savings" | "lowest-savings";

interface BusinessCaseTableProps {
  rows: BcTableRow[];
  savedNotes: Record<string, string>;
  onSaveLine: (reference: string, note: string) => void;
}

// ========== CONSTANTS ==========

const compatibilityMeta: Record<string, string> = {
  "compatible": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "Compatible": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "compatible-interface": "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "Compatible interface": "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

const oemStatusMeta: Record<string, string> = {
  "Released": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "Not released": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function formatCurrency(value: number, decimals = 3) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatSaving(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ========== POPOVER COMPONENTS ==========

type PopoverPosition = {
  top: number;
  left: number;
};

function OemReleasePopover({ details }: { details: OemDetail[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const released = details.filter((d) => d.status === "Released").length;
  const notReleased = details.length - released;
  const popoverWidth = 296;
  const popoverHeightEstimate = 248;

  const updatePosition = () => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const belowSpace = viewportHeight - rect.bottom;
    const aboveSpace = rect.top;
    const placeAbove = belowSpace < popoverHeightEstimate && aboveSpace > belowSpace;
    const preferredLeft = rect.right - popoverWidth;
    const left = Math.min(Math.max(12, preferredLeft), viewportWidth - popoverWidth - 12);
    const top = placeAbove ? Math.max(12, rect.top - popoverHeightEstimate - 8) : rect.bottom + 8;
    setPosition({ top, left });
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
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-full border border-border bg-bg/80 px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {released}/{details.length} OEMs released
      </button>

      {isOpen && position ? (
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[90] w-[296px] rounded-2xl border border-border bg-surface p-3 shadow-panel"
            style={{ top: position.top, left: position.left }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">OEM release status</p>
            <p className="mt-1 text-xs text-muted">{released} released / {notReleased} not released</p>

            <div className="mt-3 space-y-2">
              {details.map((entry) => (
                <div
                  key={entry.oem}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-bg/40 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-text">{entry.oem}</p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 font-medium", oemStatusMeta[entry.status] || "")}>
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )
      ) : null}
    </>
  );
}

function NotePopover({
  reference,
  initialNote,
  onSave,
}: {
  reference: string;
  initialNote: string;
  onSave: (reference: string, note: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState(initialNote);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const popoverWidth = 320;
  const popoverHeightEstimate = 200;

  const updatePosition = () => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const belowSpace = viewportHeight - rect.bottom;
    const aboveSpace = rect.top;
    const placeAbove = belowSpace < popoverHeightEstimate && aboveSpace > belowSpace;
    const preferredLeft = rect.right - popoverWidth;
    const left = Math.min(Math.max(12, preferredLeft), viewportWidth - popoverWidth - 12);
    const top = placeAbove ? Math.max(12, rect.top - popoverHeightEstimate - 8) : rect.bottom + 8;
    setPosition({ top, left });
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
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const handleSave = () => {
    onSave(reference, note);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary"
        title={initialNote ? `Note: ${initialNote}` : "Add note"}
      >
        <FileText className="h-3.5 w-3.5" />
        {initialNote ? "Edit note" : "Add note"}
      </button>

      {isOpen && position ? (
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[90] w-[320px] rounded-2xl border border-border bg-surface p-4 shadow-panel"
            style={{ top: position.top, left: position.left }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Notes / Risks</p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add your notes or risks here..."
              className="mt-2 h-28 w-full rounded-xl border border-border bg-bg/70 px-3 py-2 text-sm text-text resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-primary/35 hover:text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
              >
                Save note
              </button>
            </div>
          </div>,
          document.body
        )
      ) : null}
    </>
  );
}

// ========== MAIN COMPONENT ==========

export function BusinessCaseTable({ rows, savedNotes, onSaveLine }: BusinessCaseTableProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TableTab>("all");
  const [query, setQuery] = useState("");
  const [showScrollHint, setShowScrollHint] = useState(true);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const syncing = useRef<"top" | "bottom" | null>(null);

  const filteredRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.annualSaving - a.annualSaving);
    let base = sorted;

    if (tab === "highest-savings") {
      base = sorted.slice(0, 8);
    } else if (tab === "lowest-savings") {
      const lowestSorted = [...rows].sort((a, b) => a.annualSaving - b.annualSaving);
      base = lowestSorted.slice(0, 8);
    }

    if (!query.trim()) return base;
    const q = query.trim().toLowerCase();
    return base.filter(
      (row) =>
        row.reference.toLowerCase().includes(q) ||
        row.currentPn.toLowerCase().includes(q) ||
        row.targetPn.toLowerCase().includes(q) ||
        row.currentSupplier.toLowerCase().includes(q) ||
        row.targetSupplier.toLowerCase().includes(q)
    );
  }, [query, rows, tab]);

  const totalAnnualSaving = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.annualSaving, 0),
    [filteredRows]
  );

  useEffect(() => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!top || !bottom) return;

    const syncTop = () => {
      if (syncing.current === "bottom") return;
      syncing.current = "top";
      bottom.scrollLeft = top.scrollLeft;
      if (top.scrollLeft > 0) setShowScrollHint(false);
      requestAnimationFrame(() => { syncing.current = null; });
    };

    const syncBottom = () => {
      if (syncing.current === "top") return;
      syncing.current = "bottom";
      top.scrollLeft = bottom.scrollLeft;
      if (bottom.scrollLeft > 0) setShowScrollHint(false);
      requestAnimationFrame(() => { syncing.current = null; });
    };

    top.addEventListener("scroll", syncTop);
    bottom.addEventListener("scroll", syncBottom);
    return () => {
      top.removeEventListener("scroll", syncTop);
      bottom.removeEventListener("scroll", syncBottom);
    };
  }, []);

  const scrollBy = (delta: number) => {
    bottomScrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "highest-savings", label: "Highest savings" },
            { key: "lowest-savings", label: "Lowest savings" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as TableTab)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                tab === item.key ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-bg text-muted"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by Reference, PN or Supplier"
            className="h-10 w-full max-w-sm rounded-xl border border-border bg-bg/70 px-3 text-sm text-text transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <button
            type="button"
            onClick={() => scrollBy(-320)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg/70 text-sm text-text transition-colors hover:border-primary/35 hover:text-primary"
            aria-label="Scroll table left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(320)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg/70 text-sm text-text transition-colors hover:border-primary/35 hover:text-primary"
            aria-label="Scroll table right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showScrollHint ? <p className="mt-2 text-xs text-muted">Scroll horizontally for more columns</p> : null}

      <div ref={topScrollRef} className="mt-3 overflow-x-auto rounded-full bg-bg/50">
        <div className="h-3 min-w-[2100px]" />
      </div>

      <div ref={bottomScrollRef} className="mt-2 overflow-x-auto rounded-2xl border border-border/70">
        <table className="min-w-[2100px] text-sm">
          <thead className="sticky top-0 z-20 bg-surface">
            <tr className="border-b border-border bg-bg/35 text-left text-[11px] uppercase tracking-[0.16em] text-muted">
              <th className="sticky left-0 z-30 w-[170px] bg-surface px-3 py-3 font-medium shadow-[1px_0_0_0_rgba(15,23,42,0.06)] text-center">Current PN</th>
              <th className="sticky left-[170px] z-30 w-[140px] bg-surface px-3 py-3 font-medium shadow-[1px_0_0_0_rgba(15,23,42,0.06)] text-center">Current supplier</th>
              <th className="sticky left-[310px] z-30 w-[170px] bg-surface px-3 py-3 font-medium shadow-[1px_0_0_0_rgba(15,23,42,0.06)] text-center">Target PN</th>
              <th className="sticky left-[480px] z-30 w-[140px] bg-surface px-3 py-3 font-medium shadow-[1px_0_0_0_rgba(15,23,42,0.06)] text-center">Target supplier</th>
              <th className="px-3 py-3 font-medium text-center">Compatibility</th>
              <th className="px-3 py-3 font-medium text-center">OEM release</th>
              <th className="px-3 py-3 font-medium text-center">Current price</th>
              <th className="px-3 py-3 font-medium text-center">Target price</th>
              <th className="px-3 py-3 font-medium text-center">Delta price</th>
              <th className="px-3 py-3 font-medium text-center">Total annual volume</th>
              <th className="px-3 py-3 font-medium text-center">Annual saving</th>
              <th className="sticky right-0 z-30 w-[320px] bg-surface px-3 py-3 font-medium shadow-[-1px_0_0_0_rgba(15,23,42,0.06)] text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const savedNote = savedNotes[row.reference] || "";
              const compatClass = compatibilityMeta[row.compatibility] || "";

              return (
                <tr key={row.reference} className="border-b border-border/70 bg-surface/80">
                  <td className="sticky left-0 z-10 bg-surface px-3 py-3.5 font-mono text-xs text-text shadow-[1px_0_0_0_rgba(15,23,42,0.06)] text-center">{row.currentPn}</td>
                  <td className="sticky left-[170px] z-10 bg-surface px-3 py-3.5 text-muted shadow-[1px_0_0_0_rgba(15,23,42,0.06)] text-center">{row.currentSupplier}</td>
                  <td className="sticky left-[310px] z-10 bg-surface px-3 py-3.5 font-mono text-xs text-text shadow-[1px_0_0_0_rgba(15,23,42,0.06)] text-center">{row.targetPn}</td>
                  <td className="sticky left-[480px] z-10 bg-surface px-3 py-3.5 text-muted shadow-[1px_0_0_0_rgba(15,23,42,0.06)] text-center">{row.targetSupplier}</td>
                  <td className="px-3 py-3.5 align-middle text-center">
                    <div className="flex justify-center">
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", compatClass)}>
                        {row.compatibility || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 align-middle text-center">
                    <div className="flex flex-col items-center gap-1">
                      <OemReleasePopover details={row.oemDetails} />
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-medium tabular-nums text-muted text-center">{formatCurrency(row.currentPrice)}</td>
                  <td className="px-3 py-3.5 font-medium tabular-nums text-muted text-center">{formatCurrency(row.targetPrice)}</td>
                  <td className="px-3 py-3.5 font-medium tabular-nums text-muted text-center">{formatCurrency(row.deltaPrice)}</td>
                  <td className="px-3 py-3.5 tabular-nums text-muted text-center">{row.totalAnnualVolume.toLocaleString("en-US")}</td>
                  <td className="px-3 py-3.5 font-medium tabular-nums text-text text-center">{formatSaving(row.annualSaving)}</td>
                  <td className="sticky right-0 z-10 bg-surface px-3 py-3.5 shadow-[-1px_0_0_0_rgba(15,23,42,0.06)]">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/app/m3/component/${encodeURIComponent(row.currentPn)}?from=bc&role=current`)}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary"
                      >
                        View current
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/app/m3/component/${encodeURIComponent(row.targetPn)}?from=bc&role=target`)}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary"
                      >
                        View target
                      </button>
                      <NotePopover
                        reference={row.reference}
                        initialNote={savedNote}
                        onSave={(ref, note) => {
                          onSaveLine(ref, note);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-bg/60">
              <td className="px-3 py-3 text-sm font-semibold text-text text-center" colSpan={10}>
                TOTAL Annual Saving
              </td>
              <td className="px-3 py-3 text-sm font-semibold text-text text-center">{formatSaving(totalAnnualSaving)}</td>
              <td className="px-3 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}