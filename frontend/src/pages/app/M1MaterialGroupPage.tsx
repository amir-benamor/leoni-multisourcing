import { motion } from "framer-motion";
import { ArrowLeft, Boxes, Search, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { m1Api, M1MaterialGroupPart, M1TransportVolume, M1AccountUsage } from "../../services/m1Api";

const EXAMPLE_GROUPS = ["MQS 0.64", "MCON 1.2", "AK 2.8"] as const;

type GroupRow = {
  part: M1MaterialGroupPart;
};

function formatVolume(value?: number) {
  return typeof value === "number" ? `${new Intl.NumberFormat("en-US").format(value)} units/year` : "-";
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-text">{value}</p>
    </article>
  );
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

function BreakdownMetricRow({
  name,
  percentage,
  volume,
}: {
  name: string;
  percentage?: number;
  volume: number;
}) {
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
  items: M1AccountUsage[];
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

export default function M1MaterialGroupPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialGroup = searchParams.get("group") ?? "";
  const [groupInput, setGroupInput] = useState(initialGroup);
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [classificationFilter, setClassificationFilter] = useState("All");
  const [plantFilter, setPlantFilter] = useState("All");
  const [oemFilter, setOemFilter] = useState("All");
  const [selectedRow, setSelectedRow] = useState<GroupRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [materialGroupData, setMaterialGroupData] = useState<{
    material_group: string;
    total_annual_volume: number;
    parts: M1MaterialGroupPart[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGroupInput(initialGroup);
  }, [initialGroup]);

  const selectedGroup = useMemo(() => initialGroup.trim(), [initialGroup]);

  // Charger les données depuis l'API
  useEffect(() => {
    const fetchMaterialGroupData = async () => {
      if (!selectedGroup) {
        setMaterialGroupData(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await m1Api.getMaterialGroup(selectedGroup);

        if (result.success && result.data) {
          setMaterialGroupData(result.data);
        } else {
          setMaterialGroupData(null);
          setError(result.error || "Failed to load material group data");
        }
      } catch (err) {
        console.error("Error fetching material group:", err);
        setMaterialGroupData(null);
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchMaterialGroupData();
  }, [selectedGroup]);

  const hasQuery = selectedGroup.length > 0;

  // 🔥 FILTRER LES VALEURS NULL POUR LES OPTIONS DES SELECTS
  const supplierOptions = useMemo(() => {
    if (!materialGroupData?.parts) return ["All"];
    const suppliers = materialGroupData.parts
      .map((part) => part.supplier_group)
      .filter((s): s is string => s !== null && s !== undefined);
    return ["All", ...Array.from(new Set(suppliers))];
  }, [materialGroupData]);

  const classificationOptions = useMemo(() => {
    if (!materialGroupData?.parts) return ["All"];
    const classifications = materialGroupData.parts
      .map((part) => part.fors_classification)
      .filter((c): c is string => c !== null && c !== undefined);
    return ["All", ...Array.from(new Set(classifications))];
  }, [materialGroupData]);

  const plantOptions = useMemo(() => {
    if (!materialGroupData?.parts) return ["All"];
    const plants = materialGroupData.parts
      .flatMap((part) => part.plants)
      .filter((p): p is string => p !== null && p !== undefined);
    return ["All", ...Array.from(new Set(plants))];
  }, [materialGroupData]);

  const oemOptions = useMemo(() => {
    if (!materialGroupData?.parts) return ["All"];
    const oems = materialGroupData.parts
      .flatMap((part) => part.oem_applicability)
      .filter((o): o is string => o !== null && o !== undefined);
    return ["All", ...Array.from(new Set(oems))];
  }, [materialGroupData]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!materialGroupData?.parts) return [];

    return materialGroupData.parts.filter((part) => {
      if (supplierFilter !== "All" && part.supplier_group !== supplierFilter) return false;
      if (classificationFilter !== "All" && part.fors_classification !== classificationFilter) return false;
      if (plantFilter !== "All" && !part.plants.includes(plantFilter)) return false;
      if (oemFilter !== "All" && !part.oem_applicability.includes(oemFilter)) return false;
      if (!query) return true;

      const haystack = [
        part.leoni_part_number,
        part.supplier_part_number,
        part.supplier_group,
        part.fors_classification,
        part.s4_description,
        part.oem_applicability.join(" "),
        part.plants.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [classificationFilter, materialGroupData, oemFilter, plantFilter, searchQuery, supplierFilter]);

  const summary = useMemo(() => {
    if (!materialGroupData?.parts) {
      return {
        matchedParts: 0,
        uniqueSuppliers: 0,
        uniqueClassifications: 0,
        uniquePlants: 0,
        uniqueOems: 0,
        totalAnnualVolume: 0,
      };
    }

    const uniqueSuppliers = new Set(materialGroupData.parts.map((part) => part.supplier_group).filter(Boolean)).size;
    const uniqueClassifications = new Set(materialGroupData.parts.map((part) => part.fors_classification).filter(Boolean)).size;
    const uniquePlants = new Set(materialGroupData.parts.flatMap((part) => part.plants)).size;
    const uniqueOems = new Set(materialGroupData.parts.flatMap((part) => part.oem_applicability)).size;

    return {
      matchedParts: materialGroupData.parts.length,
      uniqueSuppliers,
      uniqueClassifications,
      uniquePlants,
      uniqueOems,
      totalAnnualVolume: materialGroupData.total_annual_volume,
    };
  }, [materialGroupData]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextGroup = groupInput.trim();
    if (!nextGroup) {
      setSearchParams({});
      return;
    }
    setSearchParams({ group: nextGroup });
  };

  const handleExampleClick = (group: string) => {
    setGroupInput(group);
    setSearchParams({ group });
  };

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
      className="mx-auto w-full max-w-7xl space-y-3"
    >
      <header className="rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-sm sm:px-5 sm:py-3">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Boxes className="h-3 w-3" aria-hidden="true" />
            Material Group
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[1.75rem]">Parts Data - Material Group</h1>
            <p className="mt-0.5 max-w-3xl text-sm leading-relaxed text-muted">
              Technical consultation of parts belonging to one material group. This page is focused on technical
              identification and usage context only.
            </p>
          </div>

          <nav aria-label="M1 material group actions" className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
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
              onClick={() => navigate("/app/m1/parts")}
            >
              Parts List
            </button>
          </nav>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <Input
              id="m1-material-group-input"
              label="Material group"
              value={groupInput}
              onChange={(event) => setGroupInput(event.target.value)}
              placeholder="Enter one material group (e.g. MQS 0.64)"
            />
            <Button type="submit" className="lg:min-w-[148px]" disabled={!groupInput.trim() || loading}>
              Open group
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted">Select one material group at a time to review the associated parts and usage context.</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_GROUPS.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => handleExampleClick(group)}
                  className="rounded-full border border-border/80 bg-bg/70 px-2.5 py-1 text-[11px] font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {group}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>

      {hasQuery && materialGroupData && materialGroupData.parts.length > 0 ? (
        <>
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Selected material group" value={selectedGroup} />
              <SummaryCard label="Matched parts" value={summary.matchedParts} />
              <SummaryCard label="Unique suppliers" value={summary.uniqueSuppliers} />
              <SummaryCard label="Unique classifications" value={summary.uniqueClassifications} />
              <SummaryCard label="Unique plants" value={summary.uniquePlants} />
              <SummaryCard label="Unique OEMs" value={summary.uniqueOems} />
              <SummaryCard label="Total annual volume context" value={formatVolume(summary.totalAnnualVolume)} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold text-text">Results</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Technical consultation only. Material group results are derived from the current M1 part records.
              </p>

              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1.75fr)_repeat(4,minmax(0,0.95fr))] xl:items-end">
                <div>
                  <Input
                    id="m1-material-group-search"
                    label="Local search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search results"
                    rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
                  />
                </div>

                <label className="space-y-1.5">
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

                <label className="space-y-1.5">
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

                <label className="space-y-1.5">
                  <span className="block text-sm font-medium text-text">Plant</span>
                  <select
                    value={plantFilter}
                    onChange={(event) => setPlantFilter(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none transition-colors hover:border-primary/45 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35"
                  >
                    {plantOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-sm font-medium text-text">OEM</span>
                  <select
                    value={oemFilter}
                    onChange={(event) => setOemFilter(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none transition-colors hover:border-primary/45 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35"
                  >
                    {oemOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[760px] text-sm">
                <colgroup>
                  <col className="w-[150px]" />
                  <col className="w-[170px]" />
                  <col className="w-[150px]" />
                  <col className="w-[140px]" />
                  <col className="w-[165px]" />
                  <col className="w-[190px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 font-medium">LEONI PN</th>
                    <th className="px-3 py-2 font-medium">Supplier PN</th>
                    <th className="px-3 py-2 font-medium">Supplier</th>
                    <th className="px-3 py-2 font-medium">Classification</th>
                    <th className="px-3 py-2 font-medium">Annual volume context</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((part) => (
                    <tr key={part.leoni_part_number} className="border-b border-border/70 align-top transition-colors hover:bg-primary/5">
                      <td className="px-3 py-3 font-mono text-sm text-text">{part.leoni_part_number}</td>
                      <td className="px-3 py-3 text-sm text-text">{part.supplier_part_number || "-"}</td>
                      <td className="px-3 py-3 text-sm text-text">{part.supplier_group || "-"}</td>
                      <td className="px-3 py-3 text-sm text-text">{part.fors_classification || "-"}</td>
                      <td className="px-3 py-3 text-sm text-text">
                        <div className="leading-tight">
                          <p className="font-medium text-text">{new Intl.NumberFormat("en-US").format(part.annual_volume_context)}</p>
                          <p className="text-xs text-muted">units/year</p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedRow({ part })}
                            className="rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/35 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                          >
                            View breakdown
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/app/m1/part?query=${encodeURIComponent(part.leoni_part_number)}`)}
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
            </div>

            {filteredRows.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-bg/30 px-4 py-6 text-center">
                <p className="text-sm font-medium text-text">No parts match the current filters.</p>
                <p className="mt-1 text-xs text-muted">Try changing Supplier, Classification, Plant, OEM, or the local search query.</p>
              </div>
            ) : null}
          </section>
        </>
      ) : hasQuery && error ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface/80 p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-300">{error}</p>
          <p className="mt-1 text-sm text-muted">Try one of the example material groups below to continue the technical consultation.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {EXAMPLE_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => handleExampleClick(group)}
                className="rounded-full border border-border/80 bg-bg/70 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {group}
              </button>
            ))}
          </div>
        </section>
      ) : hasQuery && materialGroupData && materialGroupData.parts.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface/80 p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-text">No parts were found for the selected material group.</p>
          <p className="mt-1 text-sm text-muted">Try one of the example material groups below to continue the technical consultation.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {EXAMPLE_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => handleExampleClick(group)}
                className="rounded-full border border-border/80 bg-bg/70 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {group}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Drawer pour le breakdown détaillé */}
      {selectedRow?.part && (() => {
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Material group breakdown</p>
                  <h3 className="mt-1 text-xl font-semibold text-text">{part.leoni_part_number}</h3>
                  <p className="mt-1 text-sm text-muted">
                    Material group {selectedGroup} matched this part record.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-border/80 bg-bg/60 px-2.5 py-1 text-[11px] font-medium text-text">
                      {materialGroupData?.material_group || selectedGroup}
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