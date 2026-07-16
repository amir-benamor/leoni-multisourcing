import { motion } from "framer-motion";
import { ArrowLeft, Building2, Search, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { m2Api, M2SupplierData, M2SupplierPartData, M2RankingItem, M2BreakdownItem } from "../../services/m2Api";

type HotspotItem = {
  label: string;
  share: number;
  value: number;
  volume: number;
};

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

function HotspotCard({
  title,
  subtitle,
  helper,
  item,
}: {
  title: string;
  subtitle: string;
  helper: string;
  item: HotspotItem | null;
}) {
  if (!item) {
    return (
      <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
        <h3 className="mt-2 text-sm font-semibold text-text">{subtitle}</h3>
        <p className="mt-3 text-sm text-muted">No supplier hotspot available in the current portfolio.</p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <h3 className="mt-2 truncate text-sm font-semibold text-text">{item.label}</h3>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-text">{item.share}%</p>
          <p className="mt-1 text-xs text-muted">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-text">{formatCurrency(item.value)}</p>
          <p className="mt-1 text-xs text-muted">{formatNumber(item.volume)} units</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/60">
        <div className="h-full rounded-full bg-primary/75" style={{ width: `${Math.max(8, item.share)}%` }} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">{helper}</p>
    </article>
  );
}

function RegionMixBlock({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: M2RankingItem[];
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
      <div className="mt-4 space-y-3">
        <div className="flex h-3 overflow-hidden rounded-full bg-border/60">
          {top3.map((item) => (
            <div
              key={item.name}
              className="h-full border-r border-surface/70 bg-primary/75 last:border-r-0"
              style={{ width: `${Math.max(8, item.percentage)}%`, opacity: 0.45 + item.percentage / 100 }}
              title={`${item.name}: ${item.percentage}%`}
            />
          ))}
        </div>
        {top3.map((item) => (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{item.name}</p>
                <p className="text-xs text-muted">
                  {formatCurrency(item.value)} | {formatNumber(item.volume)} units
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-text">{item.percentage}%</p>
            </div>
          </div>
        ))}
      </div>

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

function MixCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: M2RankingItem[];
}) {
  const top3 = items.slice(0, 3);
  const lead = top3[0];
  const secondAndThird = top3.slice(1);
  const remainingItems = items.slice(3);

  if (!lead) {
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
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-primary/15 bg-primary/8 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{lead.name}</p>
              <p className="mt-1 text-xs text-muted">
                Leading material-group exposure with {formatCurrency(lead.value)} and {formatNumber(lead.volume)} units.
              </p>
            </div>
            <p className="shrink-0 text-lg font-semibold text-primary">{lead.percentage}%</p>
          </div>
        </div>
        <div className="space-y-2">
          {secondAndThird.map((item) => (
            <div key={item.name} className="rounded-xl border border-border/70 bg-bg/40 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{item.name}</p>
                  <p className="text-xs text-muted">
                    {formatCurrency(item.value)} | {formatNumber(item.volume)} units
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-text">{item.percentage}%</p>
              </div>
            </div>
          ))}
          {items.length === 1 ? (
            <p className="text-xs text-muted">Single material group dominates the visible supplier portfolio.</p>
          ) : null}
        </div>

        {remainingItems.length > 0 && (
          <div className="relative">
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
      </div>
    </article>
  );
}

function LeadExposureBlock({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: M2RankingItem[];
}) {
  const top3 = items.slice(0, 3);
  const lead = top3[0];
  const secondAndThird = top3.slice(1);
  const remainingItems = items.slice(3);

  if (!lead) {
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
      <div className="mt-4 rounded-xl border border-primary/15 bg-primary/8 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{lead.name}</p>
            <p className="mt-1 text-xs text-muted">
              #1 exposure part with {formatCurrency(lead.value)} across {formatNumber(lead.volume)} units.
            </p>
          </div>
          <p className="shrink-0 text-lg font-semibold text-primary">{lead.percentage}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
          <div className="h-full rounded-full bg-primary/75" style={{ width: `${Math.max(10, lead.percentage)}%` }} />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {secondAndThird.map((item, index) => (
          <div key={item.name} className="rounded-xl border border-border/70 bg-bg/40 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  #{index + 2} {item.name}
                </p>
                <p className="text-xs text-muted">
                  {formatCurrency(item.value)} | {formatNumber(item.volume)} units
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-text">{item.percentage}%</p>
            </div>
          </div>
        ))}
      </div>

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

function RankingBlock({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: M2RankingItem[];
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
      <div className="mt-3 space-y-2">
        {top3.map((item, index) => (
          <div key={item.name} className="rounded-xl border border-border/70 bg-bg/40 px-3 py-2">
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
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(5, item.percentage)}%` }} />
            </div>
          </div>
        ))}
      </div>

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

function BreakdownDrawer({
  part,
  onClose,
  supplierTotalValue,
  exposureRank,
  materialGroupShare,
}: {
  part: M2SupplierPartData;
  onClose: () => void;
  supplierTotalValue: number;
  exposureRank: number;
  materialGroupShare: number;
}) {
  const navigate = useNavigate();
  const regionalRows = part.regional_data || [];
  const projectBreakdown = part.project_breakdown || [];
  const accountBreakdown = part.account_breakdown || [];
  const plantBreakdown = part.plant_breakdown || [];
  const portfolioShare = supplierTotalValue ? Math.round((part.total_value / supplierTotalValue) * 100) : 0;

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
              {part.supplier_group} - {part.fors_material_group} - {part.fors_classification}
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
          <Button type="button" className="sm:w-auto sm:px-4" onClick={() => navigate(`/app/m2/part?query=${encodeURIComponent(part.leoni_part_number)}`)}>
            Open one-part view
          </Button>
          <Button type="button" variant="secondary" className="sm:w-auto sm:px-4" onClick={() => navigate(`/app/m1/part?query=${encodeURIComponent(part.leoni_part_number)}`)}>
            Open technical view
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <section className="rounded-2xl border border-border bg-bg/25 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Supplier exposure signal</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-surface/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Share of supplier portfolio</p>
                <p className="mt-1 text-sm font-semibold text-text">{portfolioShare}%</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-surface/70 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Exposure rank / material group share</p>
                <p className="mt-1 text-sm font-semibold text-text">#{exposureRank} | {materialGroupShare}%</p>
              </div>
            </div>
          </section>
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
            <BreakdownBlockSimple title="Project breakdown" items={projectBreakdown} />
            <BreakdownBlockSimple title="Account breakdown" items={accountBreakdown} />
            <BreakdownBlockSimple title="Plant breakdown" items={plantBreakdown} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function BreakdownBlockSimple({ title, items }: { title: string; items: M2BreakdownItem[] }) {
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

export default function M2SupplierPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSupplier = searchParams.get("supplier")?.trim() ?? "";
  const [supplierInput, setSupplierInput] = useState(urlSupplier);
  const [supplierData, setSupplierData] = useState<M2SupplierData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<M2SupplierPartData | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [materialGroupFilter, setMaterialGroupFilter] = useState("All");
  const [classificationFilter, setClassificationFilter] = useState("All");

  useEffect(() => {
    setSupplierInput(urlSupplier);
    setSelectedPart(null);
  }, [urlSupplier]);

  useEffect(() => {
    const fetchSupplierData = async () => {
      if (!urlSupplier) {
        setSupplierData(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await m2Api.getSupplier(urlSupplier);

        if (result.success && result.data) {
          setSupplierData(result.data);
        } else {
          setSupplierData(null);
          setError(result.error || "Supplier not found");
        }
      } catch (err) {
        console.error("Error fetching supplier data:", err);
        setSupplierData(null);
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierData();
  }, [urlSupplier]);

  const materialGroupOptions = useMemo(
    () => ["All", ...Array.from(new Set((supplierData?.parts || []).map((p) => p.fors_material_group || "").filter(Boolean)))],
    [supplierData]
  );
  const classificationOptions = useMemo(
    () => ["All", ...Array.from(new Set((supplierData?.parts || []).map((p) => p.fors_classification || "").filter(Boolean)))],
    [supplierData]
  );

  const filteredParts = useMemo(() => {
    const parts = supplierData?.parts || [];
    const query = localSearch.trim().toLowerCase();
    return parts.filter((part) => {
      const matchesSearch =
        !query ||
        [part.leoni_part_number, part.supplier_part_number, part.fors_material_group, part.fors_classification, part.s4_description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesMaterialGroup = materialGroupFilter === "All" || part.fors_material_group === materialGroupFilter;
      const matchesClassification = classificationFilter === "All" || part.fors_classification === classificationFilter;
      return matchesSearch && matchesMaterialGroup && matchesClassification;
    });
  }, [supplierData, localSearch, materialGroupFilter, classificationFilter]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSupplier = supplierInput.trim();
    if (!normalizedSupplier) return;
    setSearchParams({ supplier: normalizedSupplier });
  };

  const topValuePartHotspot: HotspotItem | null = supplierData?.part_ranking?.[0]
    ? {
        label: supplierData.part_ranking[0].name,
        share: supplierData.part_ranking[0].percentage,
        value: supplierData.part_ranking[0].value,
        volume: supplierData.part_ranking[0].volume,
      }
    : null;

  const topMaterialGroupHotspot: HotspotItem | null = supplierData?.material_group_split?.[0]
    ? {
        label: supplierData.material_group_split[0].name,
        share: supplierData.material_group_split[0].percentage,
        value: supplierData.material_group_split[0].value,
        volume: supplierData.material_group_split[0].volume,
      }
    : null;

  const topRegionHotspot: HotspotItem | null = supplierData?.region_split?.[0]
    ? {
        label: supplierData.region_split[0].name,
        share: supplierData.region_split[0].percentage,
        value: supplierData.region_split[0].value,
        volume: supplierData.region_split[0].volume,
      }
    : null;

  const partExposureOrder = supplierData?.part_ranking || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Loading supplier data...</p>
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
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            M2 - Supplier
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">Supplier Commercial Analysis</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              Supplier-centered commercial portfolio view for value exposure, part coverage, regional concentration, and
              material-group spend visibility.
            </p>
          </div>
          <nav aria-label="M2 supplier actions" className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
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
              ["Material Group", "/app/m2/material-group"],
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
              id="m2-supplier-query"
              label="Supplier"
              value={supplierInput}
              onChange={(event) => setSupplierInput(event.target.value)}
              placeholder="Enter one supplier (e.g. TE)"
              hint="Open one supplier portfolio with regional price, volume, and value exposure."
              rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
            />
          </div>
          <div className="flex w-full sm:w-auto">
            <Button type="submit" className="sm:w-auto sm:min-w-[150px] sm:px-5" disabled={!supplierInput.trim() || loading}>
              Open supplier
            </Button>
          </div>
        </form>
      </section>

      {!urlSupplier ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center shadow-sm">
          <Building2 className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-text">Start with one supplier</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Search one supplier to read supplier portfolio value, top material groups, dominant regions, and commercial
            part exposure across the supplier scope.
          </p>
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text">No supplier portfolio found</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No commercial data matches <span className="font-medium text-text">{urlSupplier}</span>.
          </p>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{error}</p>
        </section>
      ) : supplierData && supplierData.parts.length === 0 ? (
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text">No parts found</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No parts found for supplier <span className="font-medium text-text">{urlSupplier}</span>.
          </p>
        </section>
      ) : supplierData ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {[
              { label: "Selected supplier", value: supplierData.supplier },
              { label: "Covered parts", value: String(supplierData.parts_count) },
              { label: "Covered material groups", value: String(supplierData.material_groups_count) },
              { label: "Portfolio volume", value: formatNumber(supplierData.total_volume) },
              { label: "Portfolio value", value: formatCurrency(supplierData.total_value) },
              { label: "Top part share", value: `${supplierData.top_part_share.percentage}%`, helper: supplierData.top_part_share.leoni_part_number },
              { label: "3-region parts", value: String(supplierData.three_region_coverage), helper: "parts active in all regions" },
            ].map((card) => (
              <article key={card.label} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{card.label}</p>
                <p className="mt-1 truncate text-base font-semibold text-text">{card.value}</p>
                {card.helper ? <p className="mt-1 text-xs text-muted">{card.helper}</p> : null}
              </article>
            ))}
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-text">Portfolio hotspots</h2>
              <p className="text-sm text-muted">
                Fast commercial reading of the supplier portfolio across top exposure points.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <HotspotCard title="Largest part exposure" subtitle="Highest value share in the portfolio" helper="This part currently carries the largest commercial share within the supplier portfolio." item={topValuePartHotspot} />
              <HotspotCard title="Largest material-group exposure" subtitle="Largest value concentration by material group" helper="This material group concentrates the largest share of supplier portfolio value." item={topMaterialGroupHotspot} />
              <HotspotCard title="Largest regional exposure" subtitle="Largest regional share of supplier value" helper="This region represents the strongest commercial footprint for the selected supplier." item={topRegionHotspot} />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-text">Visual analysis</h2>
              <p className="text-sm text-muted">
                Portfolio mix and exposure concentration across the main commercial portfolio dimensions.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <RegionMixBlock title="Portfolio by region" subtitle="Regional exposure mix across the supplier footprint" items={supplierData.region_split} />
              <MixCard title="Portfolio by material group" subtitle="Material-group mix by value contribution" items={supplierData.material_group_split} />
              <LeadExposureBlock title="Top parts contribution" subtitle="Leading part exposures inside the supplier portfolio" items={supplierData.part_ranking} />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-text">Portfolio concentration</h2>
              <p className="text-sm text-muted">
                Secondary concentration signals showing where supplier value accumulates after the main exposure mix.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <RankingBlock title="Dominant projects" subtitle="Top 3 derived from part value" items={supplierData.project_ranking} />
              <RankingBlock title="Dominant accounts" subtitle="Top 3 derived from part value" items={supplierData.account_ranking} />
              <RankingBlock title="Dominant plants" subtitle="Top 3 derived from part value" items={supplierData.plant_ranking} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text">Supplier parts</h2>
                <p className="mt-1 text-xs text-muted">Commercial part overview for the selected supplier portfolio.</p>
              </div>

              <div className="grid items-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <Input
                  id="m2-supplier-local-search"
                  label="Local search"
                  value={localSearch}
                  onChange={(event) => setLocalSearch(event.target.value)}
                  placeholder="Search parts"
                  rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
                />
                {[
                  ["Material group", materialGroupFilter, setMaterialGroupFilter, materialGroupOptions],
                  ["Classification", classificationFilter, setClassificationFilter, classificationOptions],
                ].map(([label, value, setter, options]) => (
                  <label key={label as string} className="block space-y-2 text-sm font-medium text-text">
                    {label as string}
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
                    <th className="px-3 py-3">Material Group</th>
                    <th className="px-3 py-3">Classification</th>
                    <th className="px-3 py-3 text-right">Total Volume</th>
                    <th className="px-3 py-3 text-right">Total Value</th>
                    <th className="px-3 py-3 text-right">Active Regions</th>
                    <th className="px-3 py-3">Price Range</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredParts.map((part) => (
                    <tr key={part.leoni_part_number} className="text-text transition-colors hover:bg-primary/5">
                      <td className="px-3 py-3 font-medium">{part.leoni_part_number}</td>
                      <td className="px-3 py-3">{part.supplier_part_number || "-"}</td>
                      <td className="px-3 py-3">{part.fors_material_group || "-"}</td>
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

      {selectedPart ? (
        <BreakdownDrawer
          part={selectedPart}
          onClose={() => setSelectedPart(null)}
          supplierTotalValue={supplierData?.total_value || 0}
          exposureRank={Math.max(1, partExposureOrder.findIndex((item) => item.name === selectedPart.leoni_part_number) + 1)}
          materialGroupShare={
            supplierData?.total_value
              ? Math.round(((supplierData.material_group_split.find((item) => item.name === selectedPart.fors_material_group)?.value ?? 0) / supplierData.total_value) * 100)
              : 0
          }
        />
      ) : null}
    </motion.section>
  );
}