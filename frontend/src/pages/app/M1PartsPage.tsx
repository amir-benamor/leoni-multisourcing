import { motion } from "framer-motion";
import { ArrowLeft, ListFilter, Search, Upload, X } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { m1Api, M1PartBatchItem } from "../../services/m1Api";

type AnalysisRow = {
  input: string;
  status: "Matched" | "Not found";
  matchType?: "LEONI PN" | "Supplier PN";
  part?: M1PartBatchItem;
};

function splitInputs(raw: string) {
  return raw
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function dedupeInputs(items: string[]) {
  return Array.from(new Set(items));
}

function parseUploadedContent(content: string) {
  return dedupeInputs(splitInputs(content));
}

function ChipList({ items }: { items: string[] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted">No data available</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-border/80 bg-bg/70 px-2.5 py-1 text-[11px] font-medium text-text">
          {item}
        </span>
      ))}
    </div>
  );
}

function BreakdownMetricRow({ name, percentage, volume }: { name: string; percentage?: number; volume: number }) {
  return (
    <div className="rounded-lg border border-border/70 bg-bg/35 px-3 py-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-text">{name}</span>
        <div className="flex items-center gap-3 text-xs text-muted">
          {typeof percentage === "number" ? <span>{percentage}%</span> : null}
          <span>{new Intl.NumberFormat("en-US").format(volume)} units/year</span>
        </div>
      </div>
    </div>
  );
}

function OemUsageList({ items }: { items: string[] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted">No OEM usage data available</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={item} className="rounded-xl border border-border/70 bg-bg/35 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-muted">OEM {index + 1}</p>
          <p className="mt-1 text-sm font-medium text-text">{item}</p>
        </div>
      ))}
    </div>
  );
}

function UsageProjectRow({
  name,
  percentage,
  volume,
}: {
  name: string;
  percentage: number;
  volume: number;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface/70 px-3 py-2.5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-text">{name}</span>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="font-medium text-text">{percentage}%</span>
          <span>{new Intl.NumberFormat("en-US").format(volume)} units/year</span>
        </div>
      </div>
    </div>
  );
}

function UsageByAccount({
  items,
  totalAnnualVolume,
}: {
  items: M1PartBatchItem["usage_by_account"];
  totalAnnualVolume: number;
}) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted">No usage data available</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((account) => (
        <section key={account.oem_brand} className="rounded-xl border border-border/70 bg-bg/35 p-3.5">
          <div className="flex flex-col gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Customer / Account</p>
              <p className="mt-1 text-sm font-semibold text-text">{account.oem_brand}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="text-sm font-medium text-text">{account.percentage}%</span>
              <span>{new Intl.NumberFormat("en-US").format(Math.round((account.percentage / 100) * totalAnnualVolume))} units/year</span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {account.projects.map((project) => (
              <UsageProjectRow
                key={`${account.oem_brand}-${project.project_name}`}
                name={project.project_name}
                percentage={project.percentage}
                volume={Math.round((project.percentage / 100) * totalAnnualVolume)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-text">{value}</p>
    </article>
  );
}

// Exemples pour la recherche rapide
const QUICK_EXAMPLES = [
  "282100-1001",
  "TE-0.64-MS112-A1",
  "1830742-1",
  "1-968849-1",
  "929504-1",
];

export default function M1PartsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rawInput, setRawInput] = useState("");
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [resultsQuery, setResultsQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [materialGroupFilter, setMaterialGroupFilter] = useState("All");
  const [classificationFilter, setClassificationFilter] = useState("All");
  const [selectedRow, setSelectedRow] = useState<AnalysisRow | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeInputs = async (items: string[]) => {
    if (items.length === 0) return;
    
    setLoading(true);
    
    try {
      const result = await m1Api.getPartsBatch(items);
      
      if (result.success && result.data) {
        const nextRows: AnalysisRow[] = result.data.map((item) => {
          if (item.error || !item.leoni_part_number) {
            return {
              input: item.input,
              status: "Not found",
            };
          }
          return {
            input: item.input,
            status: "Matched",
            matchType: item.match_type || undefined,
            part: item,
          };
        });
        setRows(nextRows);
      } else {
        console.error("Batch analysis failed:", result.error);
        alert(`Analysis failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Error during batch analysis:", error);
      alert("Failed to analyze parts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const inputs = dedupeInputs(splitInputs(rawInput));
    if (inputs.length > 0) {
      analyzeInputs(inputs);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    const parsed = parseUploadedContent(content);
    setRawInput(parsed.join("\n"));
    if (parsed.length > 0) {
      analyzeInputs(parsed);
    }
    event.target.value = "";
  };

  const uniqueInputs = useMemo(() => dedupeInputs(splitInputs(rawInput)), [rawInput]);

  // Filtrer les valeurs null pour les options des selects
  const supplierOptions = useMemo(() => {
    const suppliers = rows.flatMap((row) => (row.part ? [row.part.supplier_group] : []));
    const validSuppliers = suppliers.filter((s): s is string => s !== null && s !== undefined);
    return ["All", ...Array.from(new Set(validSuppliers))];
  }, [rows]);

  const materialGroupOptions = useMemo(() => {
    const groups = rows.flatMap((row) => (row.part ? [row.part.fors_material_group] : []));
    const validGroups = groups.filter((g): g is string => g !== null && g !== undefined);
    return ["All", ...Array.from(new Set(validGroups))];
  }, [rows]);

  const classificationOptions = useMemo(() => {
    const classifications = rows.flatMap((row) => (row.part ? [row.part.fors_classification] : []));
    const validClassifications = classifications.filter((c): c is string => c !== null && c !== undefined);
    return ["All", ...Array.from(new Set(validClassifications))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = resultsQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (supplierFilter !== "All" && row.part?.supplier_group !== supplierFilter) return false;
      if (materialGroupFilter !== "All" && row.part?.fors_material_group !== materialGroupFilter) return false;
      if (classificationFilter !== "All" && row.part?.fors_classification !== classificationFilter) return false;
      if (!query) return true;

      const haystack = [
        row.input,
        row.matchType,
        row.part?.leoni_part_number,
        row.part?.supplier_part_number,
        row.part?.supplier_group,
        row.part?.fors_material_group,
        row.part?.fors_classification,
        row.part?.s4_description,
        row.part?.oem_applicability?.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [classificationFilter, materialGroupFilter, resultsQuery, rows, supplierFilter]);

  const summary = useMemo(() => {
    const matchedRows = rows.filter((row) => row.status === "Matched" && row.part);
    const matchedParts = matchedRows.map((row) => row.part as M1PartBatchItem);

    return {
      inputLines: splitInputs(rawInput).length,
      uniqueInputs: uniqueInputs.length,
      matchedParts: matchedRows.length,
      notFound: rows.filter((row) => row.status === "Not found").length,
      uniqueSuppliers: new Set(matchedParts.map((part) => part.supplier_group).filter(Boolean)).size,
      uniqueMaterialGroups: new Set(matchedParts.map((part) => part.fors_material_group).filter(Boolean)).size,
      uniqueClassifications: new Set(matchedParts.map((part) => part.fors_classification).filter(Boolean)).size,
    };
  }, [rawInput, rows, uniqueInputs]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-7xl space-y-3"
    >
      <header className="rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-sm sm:px-5 sm:py-3">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <ListFilter className="h-3 w-3" aria-hidden="true" />
            Parts List
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.75rem]">Parts Data - List of Parts</h1>
            <p className="mt-0.5 max-w-3xl text-sm leading-relaxed text-muted">
              Technical consultation of multiple parts using LEONI PN, Supplier PN, or a mixed list of both.
            </p>
          </div>

          <nav aria-label="M1 parts list actions" className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => navigate("/app/m1")}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to M1
            </button>
            <button
              type="button"
              className="rounded-md px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => navigate("/app/m1/part")}
            >
              One Part
            </button>
            <button
              type="button"
              className="rounded-md px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => navigate("/app/m1/material-group")}
            >
              Material Group
            </button>
          </nav>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <form onSubmit={handleAnalyze} className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-text">LEONI PN or Supplier PN list</span>
              <textarea
                value={rawInput}
                onChange={(event) => setRawInput(event.target.value)}
                placeholder="Enter one LEONI PN or Supplier PN per line"
                rows={8}
                className="w-full rounded-xl border border-border bg-bg/80 px-3 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted hover:border-primary/45 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35"
              />
            </label>

            <div className="flex w-full flex-col gap-2 lg:w-auto lg:self-end">
              <Button type="submit" className="lg:min-w-[148px]" disabled={uniqueInputs.length === 0 || loading}>
                {loading ? "Analyzing..." : "Analyze list"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="lg:min-w-[148px]"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted">Enter one LEONI PN or Supplier PN per line. Empty lines are ignored and repeated inputs are deduplicated.</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setRawInput((current) => (current.trim() ? `${current.trim()}\n${example}` : example))}
                    className="rounded-full border border-border/80 bg-bg/70 px-2.5 py-1 text-[11px] font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>
      </section>

      {rows.length > 0 && (
        <>
          <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Input lines" value={summary.inputLines} />
            <SummaryCard label="Unique inputs" value={summary.uniqueInputs} />
            <SummaryCard label="Matched parts" value={summary.matchedParts} />
            <SummaryCard label="Not found" value={summary.notFound} />
            <SummaryCard label="Unique suppliers" value={summary.uniqueSuppliers} />
            <SummaryCard label="Unique material groups" value={summary.uniqueMaterialGroups} />
            <SummaryCard label="Unique classifications" value={summary.uniqueClassifications} />
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text">Results</h2>
                <p className="mt-1 text-xs text-muted">Technical batch consultation only. No commercial analysis is shown on this page.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <Input
                  id="m1-results-search"
                  label="Local search"
                  value={resultsQuery}
                  onChange={(event) => setResultsQuery(event.target.value)}
                  placeholder="Search results"
                  rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
                />

                <label className="space-y-2">
                  <span className="block text-sm font-medium text-text">Supplier</span>
                  <select
                    value={supplierFilter}
                    onChange={(event) => setSupplierFilter(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none transition-colors hover:border-primary/45 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35"
                  >
                    {supplierOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-medium text-text">Material group</span>
                  <select
                    value={materialGroupFilter}
                    onChange={(event) => setMaterialGroupFilter(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none transition-colors hover:border-primary/45 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35"
                  >
                    {materialGroupOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="block text-sm font-medium text-text">Classification</span>
                  <select
                    value={classificationFilter}
                    onChange={(event) => setClassificationFilter(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none transition-colors hover:border-primary/45 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35"
                  >
                    {classificationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[900px] text-sm">
                <colgroup>
                  <col className="w-[140px]" />
                  <col className="w-[140px]" />
                  <col className="w-[170px]" />
                  <col className="w-[120px]" />
                  <col className="w-[120px]" />
                  <col className="w-[130px]" />
                  <col className="w-[150px]" />
                  <col className="w-[180px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 font-medium">Input</th>
                    <th className="px-3 py-2 font-medium">LEONI PN</th>
                    <th className="px-3 py-2 font-medium">Supplier PN</th>
                    <th className="px-3 py-2 font-medium">Supplier</th>
                    <th className="px-3 py-2 font-medium">Material group</th>
                    <th className="px-3 py-2 font-medium">Classification</th>
                    <th className="px-3 py-2 font-medium">Annual volume context</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={`${row.input}-${row.part?.leoni_part_number ?? "missing"}`} className="border-b border-border/70 align-top transition-colors hover:bg-primary/5">
                      <td className="px-3 py-3 font-mono text-xs text-text">{row.input}</td>
                      <td className="px-3 py-3 text-sm text-text">{row.part?.leoni_part_number ?? "-"}</td>
                      <td className="px-3 py-3 text-sm text-text">{row.part?.supplier_part_number ?? "-"}</td>
                      <td className="px-3 py-3 text-sm text-text">{row.part?.supplier_group ?? "-"}</td>
                      <td className="px-3 py-3 text-sm text-text">{row.part?.fors_material_group ?? "-"}</td>
                      <td className="px-3 py-3 text-sm text-text">{row.part?.fors_classification ?? "-"}</td>
                      <td className="px-3 py-3 text-sm text-text">
                        {row.part?.annual_volume_context ? (
                          <div className="leading-tight">
                            <p className="font-medium text-text">{new Intl.NumberFormat("en-US").format(row.part.annual_volume_context)}</p>
                            <p className="text-xs text-muted">units/year</p>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {row.part ? (
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedRow(row)}
                              className="rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/35 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            >
                              View breakdown
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/app/m1/part?query=${encodeURIComponent(row.part?.leoni_part_number ?? row.input)}`)}
                              className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                            >
                              Open part
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Drawer pour le breakdown détaillé - CORRIGÉ avec variable locale */}
      {selectedRow && selectedRow.part && (() => {
        const part = selectedRow.part;
        return (
          <div className="fixed inset-0 z-50 bg-slate-950/35">
            <button
              type="button"
              className="absolute inset-0 h-full w-full cursor-default"
              aria-label="Close breakdown drawer backdrop"
              onClick={() => setSelectedRow(null)}
            />
            <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-surface p-4 shadow-panel sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Technical breakdown</p>
                  <h3 className="mt-1 text-xl font-semibold text-text">{part.leoni_part_number}</h3>
                  <p className="mt-1 text-sm text-muted">
                    Input {selectedRow.input} matched by {selectedRow.matchType}.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-border/80 bg-bg/60 px-2.5 py-1 text-[11px] font-medium text-text">
                      {part.fors_material_group || "N/A"}
                    </span>
                    <span className="rounded-full border border-border/80 bg-bg/60 px-2.5 py-1 text-[11px] font-medium text-text">
                      {part.fors_classification || "N/A"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRow(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg/70 text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  aria-label="Close breakdown drawer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <section className="rounded-2xl border border-border bg-bg/25 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Part description</h4>
                  <p className="mt-2 text-sm text-text">{part.s4_description || "Not available"}</p>
                </section>

                <section className="rounded-2xl border border-border bg-bg/25 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">OEM usage</h4>
                  <div className="mt-2.5">
                    <OemUsageList items={part.oem_applicability || []} />
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-bg/25 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Usage breakdown</h4>
                  <div className="mt-2.5">
                    <UsageByAccount
                      items={part.usage_by_account || []}
                      totalAnnualVolume={part.annual_volume_context ?? 0}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-bg/25 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Region breakdown</h4>
                  <div className="mt-2.5 space-y-2">
                    {part.volume_by_region?.map((entry) => (
                      <BreakdownMetricRow
                        key={entry.name}
                        name={entry.name}
                        percentage={part.annual_volume_context ? Math.round((entry.volume / part.annual_volume_context) * 100) : undefined}
                        volume={entry.volume}
                      />
                    ))}
                  </div>
                </section>

                {part.volume_by_country && part.volume_by_country.length > 0 && (
                  <section className="rounded-2xl border border-border bg-bg/25 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Countries</h4>
                    <div className="mt-2.5 space-y-2">
                      {part.volume_by_country.map((entry) => (
                        <BreakdownMetricRow key={entry.name} name={entry.name} volume={entry.volume} />
                      ))}
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border border-border bg-bg/25 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Plants</h4>
                  <div className="mt-2">
                    <ChipList items={part.plants || []} />
                  </div>
                </section>
              </div>
            </aside>
          </div>
        );
      })()}
    </motion.section>
  );
}