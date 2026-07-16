import { motion } from "framer-motion";
import { ArrowLeft, Boxes, Search, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { m2Api, M2MaterialGroupData, M2MaterialGroupPartData, M2RankingItem, M2BreakdownItem,  } from "../../services/m2Api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUnitPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function BreakdownDrawer({ part, onClose }: { part: M2MaterialGroupPartData; onClose: () => void }) {
  const navigate = useNavigate();
  const regionalRows = part.regional_data || [];
  const projectBreakdown = part.project_breakdown || [];
  const accountBreakdown = part.account_breakdown || [];
  const plantBreakdown = part.plant_breakdown || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="Close breakdown drawer backdrop"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-surface p-4 shadow-panel sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Commercial breakdown</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-text">{part.leoni_part_number}</h2>
            <p className="mt-1 text-sm text-muted">
              {part.supplier_group} - {part.fors_classification}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                {formatUnitPrice(part.price_range.min)} - {formatUnitPrice(part.price_range.max)}
              </span>
              <span className="rounded-full border border-border/80 bg-bg/60 px-2.5 py-1 text-[11px] font-medium text-text">
                {formatNumber(part.total_volume)} units
              </span>
              <span className="rounded-full border border-border/80 bg-bg/60 px-2.5 py-1 text-[11px] font-medium text-text">
                {formatCurrency(part.total_value)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg/70 text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label="Close breakdown drawer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            className="sm:w-auto sm:px-4"
            onClick={() => navigate(`/app/m2/part?query=${encodeURIComponent(part.leoni_part_number)}`)}
          >
            Open one-part view
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-4"
            onClick={() => navigate(`/app/m1/part?query=${encodeURIComponent(part.leoni_part_number)}`)}
          >
            Open technical view
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <section className="rounded-2xl border border-border bg-bg/25 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Commercial summary</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                ["Price range", `${formatUnitPrice(part.price_range.min)} - ${formatUnitPrice(part.price_range.max)}`],
                ["Total volume", `${formatNumber(part.total_volume)} units`],
                ["Total value", formatCurrency(part.total_value)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border/70 bg-surface/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-text">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-bg/25 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Regional commercial rows</h3>
            <div className="mt-2.5 space-y-2">
              {regionalRows.map((row) => (
                <div key={row.region} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-bg/35 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-text">{row.region}</p>
                    <p className="text-xs text-muted">
                      {formatUnitPrice(row.unit_price || 0)} x {formatNumber(row.volume)} units
                    </p>
                  </div>
                  <p className="font-semibold text-text">{formatCurrency(row.value)}</p>
                </div>
              ))}
              {regionalRows.length === 0 && (
                <p className="text-sm text-muted text-center py-2">No regional data available</p>
              )}
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-3">
            <BreakdownBlock title="Project breakdown" items={projectBreakdown} />
            <BreakdownBlock title="Account breakdown" items={accountBreakdown} />
            <BreakdownBlock title="Plant breakdown" items={plantBreakdown} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function BreakdownBlock({ title, items }: { title: string; items: M2BreakdownItem[] }) {
  if (!items || items.length === 0) {
    return (
      <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="mt-3 text-sm text-muted">No data available</p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.name} className="rounded-xl border border-border/70 bg-bg/40 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted">{formatNumber(item.volume)} units</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-text">{item.percentage}%</p>
                <p className="mt-0.5 text-xs text-muted">{formatCurrency(item.value)}</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${item.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function DominanceSpotlightCard({
  title,
  subtitle,
  items,
  dominantHelper,
}: {
  title: string;
  subtitle: string;
  items: M2RankingItem[];
  dominantHelper: string;
}) {
  const lead = items[0];
  const hasSingleLeader = items.length <= 1 || (items[1]?.percentage ?? 0) < 1;
  const secondItem = items[1];
  const remainingItems = items.slice(2);

  if (!lead) return null;

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>
      <div className="mt-4 rounded-xl border border-primary/15 bg-primary/8 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-text">{lead.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {hasSingleLeader ? dominantHelper : "Leading value concentration in the selected material group."}
            </p>
          </div>
          <p className="shrink-0 text-2xl font-semibold tracking-tight text-primary">{lead.percentage}%</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-primary/10 bg-surface/75 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Value</p>
            <p className="mt-1 text-sm font-semibold text-text">{formatCurrency(lead.value)}</p>
          </div>
          <div className="rounded-xl border border-primary/10 bg-surface/75 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Volume</p>
            <p className="mt-1 text-sm font-semibold text-text">{formatNumber(lead.volume)} units</p>
          </div>
        </div>
      </div>
      {secondItem ? (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-border/70 bg-bg/35 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{secondItem.name}</p>
                <p className="text-xs text-muted">
                  {formatCurrency(secondItem.value)} | {formatNumber(secondItem.volume)} units
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-text">{secondItem.percentage}%</p>
            </div>
          </div>
        </div>
      ) : null}
      {remainingItems.length >= 1 ? (
        <div className="relative mt-3">
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 list-none">
              View more details
            </summary>
            <div className="mt-2 space-y-2">
              {remainingItems.map((item, index) => (
                <div key={item.name} className="rounded-xl border border-border/70 bg-bg/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">#{index + 3} {item.name}</p>
                      <p className="text-xs text-muted">
                        {formatCurrency(item.value)} | {formatNumber(item.volume)} units
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-text">{item.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : null}
    </article>
  );
}

function RegionMixCard({ title, subtitle, items }: { title: string; subtitle: string; items: M2RankingItem[] }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>
      <div className="mt-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-border/60">
          {items.map((item) => (
            <div
              key={item.name}
              className="h-full border-r border-surface/70 bg-primary/75 last:border-r-0"
              style={{ width: `${Math.max(8, item.percentage)}%`, opacity: 0.45 + item.percentage / 100 }}
              title={`${item.name}: ${item.percentage}%`}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {items.map((item, index) => (
          <div key={item.name} className="rounded-xl border border-border/70 bg-bg/35 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="truncate text-sm font-medium text-text">{item.name}</p>
                </div>
                <p className="mt-1 text-xs text-muted">{formatNumber(item.volume)} units</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-text">{item.percentage}%</p>
                <p className="mt-1 text-xs text-muted">{formatCurrency(item.value)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function RankingBlock({
  title,
  subtitle,
  items,
  compact = false,
}: {
  title: string;
  subtitle: string;
  items: M2RankingItem[];
  compact?: boolean;
}) {
  const top3 = items.slice(0, 3);
  const remainingItems = items.slice(3);

  if (!items || items.length === 0) {
    return (
      <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="mt-3 text-sm text-muted">No data available</p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>
      <div className={`mt-3 ${compact ? "space-y-1.5" : "space-y-2"}`}>
        {top3.map((item, index) => (
          <div key={item.name} className={`rounded-xl border border-border/70 bg-bg/40 px-3 ${compact ? "py-2" : "py-2.5"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="truncate text-sm font-medium text-text">{item.name}</p>
                </div>
                <p className={`${compact ? "mt-0.5" : "mt-1"} text-xs text-muted`}>{formatNumber(item.volume)} units</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-text">{item.percentage}%</p>
                <p className={`${compact ? "mt-0.5" : "mt-1"} text-xs text-muted`}>{formatCurrency(item.value)}</p>
              </div>
            </div>
            <div className={`${compact ? "mt-1.5" : "mt-2"} h-1.5 overflow-hidden rounded-full bg-border/60`}>
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(5, item.percentage)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* View more details */}
      {remainingItems.length > 0 && (
        <div className="relative mt-3">
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 list-none">
              View more details
            </summary>
            <div className="mt-2 space-y-2">
              {remainingItems.map((item, index) => (
                <div key={item.name} className="rounded-xl border border-border/70 bg-bg/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">#{index + 4} {item.name}</p>
                      <p className="text-xs text-muted">
                        {formatCurrency(item.value)} | {formatNumber(item.volume)} units
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-text">{item.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </article>
  );
}

export default function M2MaterialGroupPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlGroup = searchParams.get("group")?.trim() ?? "";
  const [groupInput, setGroupInput] = useState(urlGroup);
  const [groupData, setGroupData] = useState<M2MaterialGroupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<M2MaterialGroupPartData | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [classificationFilter, setClassificationFilter] = useState("All");

  useEffect(() => {
    setGroupInput(urlGroup);
    setSelectedPart(null);
  }, [urlGroup]);

  // Charger les données depuis l'API
  useEffect(() => {
    const fetchGroupData = async () => {
      if (!urlGroup) {
        setGroupData(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await m2Api.getMaterialGroup(urlGroup);

        if (result.success && result.data) {
          setGroupData(result.data);
        } else {
          setGroupData(null);
          setError(result.error || "Material group not found");
        }
      } catch (err) {
        console.error("Error fetching material group data:", err);
        setGroupData(null);
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [urlGroup]);

  const supplierOptions = useMemo(
    () => ["All", ...Array.from(new Set((groupData?.parts || []).map((p) => p.supplier_group || "").filter(Boolean)))],
    [groupData]
  );
  const classificationOptions = useMemo(
    () => ["All", ...Array.from(new Set((groupData?.parts || []).map((p) => p.fors_classification || "").filter(Boolean)))],
    [groupData]
  );

  const filteredParts = useMemo(() => {
    const parts = groupData?.parts || [];
    const query = localSearch.trim().toLowerCase();
    return parts.filter((part) => {
      const matchesSearch =
        !query ||
        [part.leoni_part_number, part.supplier_part_number, part.supplier_group, part.fors_classification, part.s4_description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesSupplier = supplierFilter === "All" || part.supplier_group === supplierFilter;
      const matchesClassification = classificationFilter === "All" || part.fors_classification === classificationFilter;
      return matchesSearch && matchesSupplier && matchesClassification;
    });
  }, [groupData, localSearch, supplierFilter, classificationFilter]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedGroup = groupInput.trim();
    if (!normalizedGroup) return;
    setSearchParams({ group: normalizedGroup });
  };

  const kpiCards = groupData
    ? [
        { label: "Selected material group", value: groupData.material_group },
        { label: "Matched parts", value: String(groupData.parts_count) },
        { label: "Unique suppliers", value: String(groupData.suppliers_count) },
        { label: "Total volume", value: formatNumber(groupData.total_volume) },
        { label: "Total value", value: formatCurrency(groupData.total_value) },
        {
          label: "Top part share",
          value: `${groupData.top_part_share.percentage}%`,
          helper: groupData.top_part_share.leoni_part_number,
        },
        { label: "3-region coverage", value: String(groupData.three_region_coverage), helper: "parts active in all regions" },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Loading material group data...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-7xl space-y-4"
    >
      <header className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
            M2 - Material Group
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">Commercial Material Group Overview</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              Aggregated commercial reading by material group, focused on spend visibility, regional price context, value
              concentration, and supplier portfolio exposure.
            </p>
          </div>
          <nav aria-label="M2 material group actions" className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => navigate("/app/m2")}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to M2
            </button>
            {[
              ["One Part", "/app/m2/part"],
              ["Parts List", "/app/m2/parts"],
              ["Supplier Analysis", "/app/m2/supplier"],
            ].map(([label, href]) => (
              <button
                key={href}
                type="button"
                className="rounded-md px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                onClick={() => navigate(href)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <Input
              id="m2-material-group-query"
              label="Material group"
              value={groupInput}
              onChange={(event) => setGroupInput(event.target.value)}
              placeholder="Enter one material group (e.g. MQS 0.64)"
              hint="Open one commercial material-group view with regional price, volume, and value aggregation."
              rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
            />
          </div>
          <div className="flex w-full sm:w-auto">
            <Button type="submit" className="sm:w-auto sm:min-w-[150px] sm:px-5" disabled={!groupInput.trim() || loading}>
              Open group
            </Button>
          </div>
        </form>
      </section>

      {!urlGroup ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center shadow-sm">
          <Boxes className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-text">Start with one material group</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Search one material group to read total value, supplier value share, dominant regions, and commercial part
            exposure across the selected group.
          </p>
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text">No commercial material-group record found</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No commercial data matches <span className="font-medium text-text">{urlGroup}</span>.
          </p>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{error}</p>
        </section>
      ) : groupData && groupData.parts.length === 0 ? (
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text">No parts found</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No parts found for material group <span className="font-medium text-text">{urlGroup}</span>.
          </p>
        </section>
      ) : groupData ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {kpiCards.map((card) => (
              <article
                key={card.label}
                className={`rounded-2xl border p-3 shadow-sm ${
                  card.label === "Top part share"
                    ? "border-primary/20 bg-primary/10 shadow-[0_10px_24px_-18px_rgba(30,64,175,0.65)]"
                    : "border-border bg-surface"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
                <p className={`mt-1 truncate font-semibold ${card.label === "Top part share" ? "text-lg text-primary" : "text-base text-text"}`}>
                  {card.value}
                </p>
                {card.helper ? <p className="mt-1 text-xs text-muted">{card.helper}</p> : null}
              </article>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <DominanceSpotlightCard
              title="Supplier split"
              subtitle={groupData.supplier_split.length === 1 ? "Single-supplier material group" : "Primary metric: value share"}
              items={groupData.supplier_split}
              dominantHelper="Single-supplier material group with value fully concentrated in one supplier."
            />
            <RegionMixCard title="Dominant regions" subtitle="Top 3 by value share" items={groupData.region_split} />
            <RankingBlock title="Dominant projects" subtitle="Top 3 derived from part value" items={groupData.project_ranking} compact />
            <RankingBlock title="Dominant accounts" subtitle="Top 3 derived from part value" items={groupData.account_ranking} compact />
            <RankingBlock title="Dominant plants" subtitle="Top 3 derived from part value" items={groupData.plant_ranking} compact />
            <DominanceSpotlightCard
              title="Classification mix"
              subtitle={groupData.classification_split.length === 1 ? "Fully concentrated in one classification" : "Top 3 by value share"}
              items={groupData.classification_split}
              dominantHelper="Fully concentrated in one classification across the selected material group."
            />
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text">Parts in material group</h2>
                <p className="mt-1 text-xs text-muted">Commercial part overview for the selected material group.</p>
              </div>

              <div className="grid items-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <Input
                  id="m2-material-group-local-search"
                  label="Local search"
                  value={localSearch}
                  onChange={(event) => setLocalSearch(event.target.value)}
                  placeholder="Search parts"
                  rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
                />
                {[
                  ["Supplier", supplierFilter, setSupplierFilter, supplierOptions],
                  ["Classification", classificationFilter, setClassificationFilter, classificationOptions],
                ].map(([label, value, setter, options]) => (
                  <label key={label as string} className="flex flex-col gap-2 text-sm font-medium text-text">
                    <span>{label as string}</span>
                    <select
                      value={value as string}
                      onChange={(event) => (setter as (nextValue: string) => void)(event.target.value)}
                      className="h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none transition-colors hover:border-primary/45 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35"
                    >
                      {(options as string[]).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[980px] divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-3 py-3">LEONI PN</th>
                    <th className="px-3 py-3">Supplier PN</th>
                    <th className="px-3 py-3">Supplier</th>
                    <th className="px-3 py-3">Classification</th>
                    <th className="px-3 py-3 text-right">Total volume</th>
                    <th className="px-3 py-3 text-right">Total value</th>
                    <th className="px-3 py-3 text-right">Active regions</th>
                    <th className="px-3 py-3">Price range</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredParts.map((part) => (
                    <tr key={part.leoni_part_number} className="text-text transition-colors hover:bg-primary/5">
                      <td className="px-3 py-3 font-medium">{part.leoni_part_number}</td>
                      <td className="px-3 py-3">{part.supplier_part_number || "-"}</td>
                      <td className="px-3 py-3">{part.supplier_group || "-"}</td>
                      <td className="px-3 py-3">{part.fors_classification || "-"}</td>
                      <td className="px-3 py-3 text-right">{formatNumber(part.total_volume)}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatCurrency(part.total_value)}</td>
                      <td className="px-3 py-3 text-right">{part.active_regions}</td>
                      <td className="px-3 py-3">
                        {formatUnitPrice(part.price_range.min)} - {formatUnitPrice(part.price_range.max)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedPart(part)}
                            className="rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/35 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                          >
                            View breakdown
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/app/m2/part?query=${encodeURIComponent(part.leoni_part_number)}`)}
                            className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                          >
                            Open part
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredParts.length === 0 && (
                <p className="text-center text-sm text-muted py-8">No parts match your filters</p>
              )}
            </div>
          </section>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => navigate("/app/m2")}
        className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to M2
      </button>

      {selectedPart ? <BreakdownDrawer part={selectedPart} onClose={() => setSelectedPart(null)} /> : null}
    </motion.section>
  );
}