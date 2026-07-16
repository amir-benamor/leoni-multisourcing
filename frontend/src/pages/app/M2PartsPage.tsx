import { motion } from "framer-motion";
import { ArrowLeft, FileUp, Layers3, ListFilter, Search, X } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { m2Api, M2BatchPartData, M2BreakdownItem, M2RegionalData } from "../../services/m2Api";

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

function parseInputList(text: string) {
  const seen = new Set<string>();
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getTotalVolume(data: M2BatchPartData) {
  return data.total_volume || 0;
}

function getTotalValue(data: M2BatchPartData) {
  return data.total_value || 0;
}

function getPriceRange(data: M2BatchPartData) {
  if (data.price_range) {
    return `${formatUnitPrice(data.price_range.min)} - ${formatUnitPrice(data.price_range.max)}`;
  }
  return "N/A";
}

function getUniqueValues(rows: M2BatchPartData[], selector: (row: M2BatchPartData) => string) {
  return new Set(rows.filter(r => !r.error).map(row => selector(row))).size;
}

function BreakdownBlock({
  title,
  items,
  totalVolume,
  totalValue,
}: {
  title: string;
  items: M2BreakdownItem[];
  totalVolume: number;
  totalValue: number;
}) {
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

function DetailDrawer({ part, onClose }: { part: M2BatchPartData; onClose: () => void }) {
  const navigate = useNavigate();
  const totalVolume = getTotalVolume(part);
  const totalValue = getTotalValue(part);
  const regionalRows = part.regional_data || [];
  const projectBreakdown = part.project_breakdown || [];
  const accountBreakdown = part.account_breakdown || [];
  const plantBreakdown = part.plant_breakdown || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="Close commercial breakdown drawer backdrop"
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
                {getPriceRange(part)}
              </span>
              <span className="rounded-full border border-border/80 bg-bg/60 px-2.5 py-1 text-[11px] font-medium text-text">
                {formatNumber(totalVolume)} units
              </span>
              <span className="rounded-full border border-border/80 bg-bg/60 px-2.5 py-1 text-[11px] font-medium text-text">
                {formatCurrency(totalValue)}
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
            onClick={() => navigate(`/app/m2/part?query=${encodeURIComponent(part.leoni_part_number || '')}`)}
          >
            Open one-part view
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="sm:w-auto sm:px-4"
            onClick={() => navigate(`/app/m1/part?query=${encodeURIComponent(part.leoni_part_number || '')}`)}
          >
            Open technical view
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <section className="rounded-2xl border border-border bg-bg/25 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Commercial summary</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                ["Price range", getPriceRange(part)],
                ["Total volume", `${formatNumber(totalVolume)} units`],
                ["Total value", formatCurrency(totalValue)],
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
            <BreakdownBlock title="Project breakdown" items={projectBreakdown} totalVolume={totalVolume} totalValue={totalValue} />
            <BreakdownBlock title="Account breakdown" items={accountBreakdown} totalVolume={totalVolume} totalValue={totalValue} />
            <BreakdownBlock title="Plant breakdown" items={plantBreakdown} totalVolume={totalVolume} totalValue={totalValue} />
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function M2PartsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [inputText, setInputText] = useState("");
  const [rows, setRows] = useState<M2BatchPartData[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [materialGroupFilter, setMaterialGroupFilter] = useState("All");
  const [classificationFilter, setClassificationFilter] = useState("All");
  const [selectedPart, setSelectedPart] = useState<M2BatchPartData | null>(null);

  const uniqueInputs = useMemo(() => parseInputList(inputText), [inputText]);
  const matchedRows = rows.filter((row) => !row.error);
  const totalVolume = matchedRows.reduce((sum, row) => sum + getTotalVolume(row), 0);
  const totalValue = matchedRows.reduce((sum, row) => sum + getTotalValue(row), 0);

  const supplierOptions = useMemo(
    () => ["All", ...Array.from(new Set(matchedRows.map((row) => row.supplier_group).filter(Boolean)))],
    [matchedRows]
  );
  const materialGroupOptions = useMemo(
    () => ["All", ...Array.from(new Set(matchedRows.map((row) => row.fors_material_group).filter(Boolean)))],
    [matchedRows]
  );
  const classificationOptions = useMemo(
    () => ["All", ...Array.from(new Set(matchedRows.map((row) => row.fors_classification).filter(Boolean)))],
    [matchedRows]
  );

  const filteredRows = useMemo(() => {
    const search = localSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const searchable = [row.input, row.leoni_part_number, row.supplier_part_number, row.supplier_group, row.fors_material_group, row.fors_classification]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !search || searchable.includes(search);
      const matchesSupplier = supplierFilter === "All" || row.supplier_group === supplierFilter;
      const matchesMaterialGroup = materialGroupFilter === "All" || row.fors_material_group === materialGroupFilter;
      const matchesClassification = classificationFilter === "All" || row.fors_classification === classificationFilter;
      return matchesSearch && matchesSupplier && matchesMaterialGroup && matchesClassification;
    });
  }, [classificationFilter, localSearch, materialGroupFilter, rows, supplierFilter]);

  const analyzeList = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const inputs = parseInputList(inputText);
    
    if (!inputs.length) return;
    
    setLoading(true);
    setHasAnalyzed(true);
    setSelectedPart(null);

    try {
      const result = await m2Api.getPartsBatch(inputs);
      if (result.success && result.data) {
        setRows(result.data);
      } else {
        console.error("Batch API error:", result.error);
        setRows([]);
      }
    } catch (err) {
      console.error("Error fetching batch data:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      const parsed = parseInputList(content).join("\n");
      setInputText(parsed);
      setRows([]);
      setHasAnalyzed(false);
      setSelectedPart(null);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

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
            <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
            M2 - Parts List
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">Commercial Parts List</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
              Batch commercial reading of multiple parts, designed to compare value exposure, volume signals, material group
              spend, and supplier portfolio context across a selected list.
            </p>
          </div>
          <nav aria-label="M2 parts list actions" className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
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
              ["Material Group", "/app/m2/material-group"],
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
        <form onSubmit={analyzeList} className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label htmlFor="m2-parts-input" className="text-sm font-medium text-text">
                LEONI PN / Supplier PN list
              </label>
              <textarea
                id="m2-parts-input"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Enter one LEONI PN or Supplier PN per line"
                className="mt-2 min-h-36 w-full resize-y rounded-xl border border-border bg-bg px-3 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-primary/55 focus:ring-2 focus:ring-ring/30"
              />
              <p className="mt-2 text-xs text-muted">Empty lines are ignored. Repeated inputs are deduplicated before analysis.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col">
              <Button type="submit" className="sm:min-w-[150px]" disabled={!uniqueInputs.length || loading}>
                {loading ? "Analyzing..." : "Analyze list"}
              </Button>
              <input ref={fileInputRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleUpload} />
              <Button type="button" variant="secondary" className="sm:min-w-[150px]" leftIcon={<FileUp className="h-4 w-4" />} onClick={() => fileInputRef.current?.click()}>
                Upload file
              </Button>
            </div>
          </div>
        </form>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Analyzing parts list...</p>
        </section>
      ) : !hasAnalyzed ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center shadow-sm">
          <Layers3 className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-text">Analyze a commercial part list</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Paste or upload a mixed list of LEONI PN and Supplier PN values to read total volume, total value, supplier
            exposure, and regional commercial scope across the list.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {[
              ["Input lines", String(inputText.split(/\r?\n/).filter((line) => line.trim()).length)],
              ["Unique inputs", String(uniqueInputs.length)],
              ["Matched parts", String(matchedRows.length)],
              ["Not found", String(rows.length - matchedRows.length)],
              ["Total volume", formatNumber(totalVolume)],
              ["Total value", formatCurrency(totalValue)],
              ["Unique suppliers", String(getUniqueValues(rows, (r) => r.supplier_group || ""))],
              ["Unique material groups", String(getUniqueValues(rows, (r) => r.fors_material_group || ""))],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 text-base font-semibold text-text">{value}</p>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text">Results</h2>
                <p className="mt-1 text-xs text-muted">Commercial batch overview based on the analyzed list.</p>
              </div>

              <div className="grid items-start gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Input
                  id="m2-parts-local-search"
                  label="Local search"
                  value={localSearch}
                  onChange={(event) => setLocalSearch(event.target.value)}
                  placeholder="Search rows"
                  rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
                />
                {[
                  ["Supplier", supplierFilter, setSupplierFilter, supplierOptions],
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

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[1120px] divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-3 py-3">Input</th>
                    <th className="px-3 py-3">LEONI PN</th>
                    <th className="px-3 py-3">Supplier PN</th>
                    <th className="px-3 py-3">Supplier</th>
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
                  {filteredRows.map((row) => (
                    <tr key={row.input} className="text-text transition-colors hover:bg-primary/5">
                      <td className="px-3 py-3 font-mono text-xs">{row.input}</td>
                      <td className="px-3 py-3 font-medium">{row.leoni_part_number ?? "-"}</td>
                      <td className="px-3 py-3">{row.supplier_part_number ?? "-"}</td>
                      <td className="px-3 py-3">{row.supplier_group ?? "-"}</td>
                      <td className="px-3 py-3">{row.fors_material_group ?? "Not available"}</td>
                      <td className="px-3 py-3">{row.fors_classification ?? "Not available"}</td>
                      <td className="px-3 py-3 text-right">{row.error ? "-" : formatNumber(getTotalVolume(row))}</td>
                      <td className="px-3 py-3 text-right font-semibold">{row.error ? "-" : formatCurrency(getTotalValue(row))}</td>
                      <td className="px-3 py-3 text-right">{row.active_regions ?? "-"}</td>
                      <td className="px-3 py-3">
                        {row.error ? (
                          <span className="rounded-full border border-border/80 bg-bg/60 px-2.5 py-1 text-[11px] font-medium text-muted">
                            Not found
                          </span>
                        ) : (
                          getPriceRange(row)
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {!row.error ? (
                          <div className="flex justify-end gap-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedPart(row)}
                              className="rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/35 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            >
                              View breakdown
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/app/m2/part?query=${encodeURIComponent(row.leoni_part_number || '')}`)}
                              className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            >
                              Open part
                            </button>
                          </div>
                        ) : (
                          <span className="flex justify-end text-xs font-medium text-muted">Not found</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <p className="text-center text-sm text-muted py-8">No results match your filters</p>
              )}
            </div>
          </section>
        </>
      )}

      <button
        type="button"
        onClick={() => navigate("/app/m2")}
        className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to M2
      </button>

      {selectedPart ? <DetailDrawer part={selectedPart} onClose={() => setSelectedPart(null)} /> : null}
    </motion.section>
  );
}