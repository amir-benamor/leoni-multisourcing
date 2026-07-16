import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlternativesTable } from "../../components/component/AlternativesTable";
import { PricePreview } from "../../components/component/PricePreview";
import { VolumeCharts } from "../../components/component/VolumeCharts";
import { Button } from "../../components/ui/Button";
import { useFilters } from "../../context/FiltersContext";
import { alternativeApi, AlternativePart, PartAlternativeData } from "../../services/alternativeApi";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

export default function ComponentDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { filters } = useFilters();
  const msNumber = id;

  // États
  const [data, setData] = useState<PartAlternativeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetPartNumber, setTargetPartNumber] = useState<string | null>(null);

  // Charger les données depuis l'API
  useEffect(() => {
    const fetchData = async () => {
      if (!msNumber) return;

      setLoading(true);
      setError(null);

      try {
        const result = await alternativeApi.getAlternatives(msNumber, filters.region);

        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || 'MS group not found');
        }
      } catch (err) {
        console.error('Error fetching alternatives:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [msNumber, filters.region]);

  // Current part = la première alternative
  const currentPart: AlternativePart | null = data?.alternatives?.[0] ?? null;

  // Target part = l'alternative sélectionnée
  const targetPart: AlternativePart | null = targetPartNumber
    ? data?.alternatives.find((p) => p.leoni_part_number === targetPartNumber) ?? null
    : null;

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Loading alternatives...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <section  className="rounded-2xl border border-border bg-surface p-6 shadow-premium">
        <h1 className="text-xl font-semibold">MS group not found</h1>
        <p className="mt-2 text-sm text-muted">
          {error || `The MS group "${msNumber}" is not available.`}
        </p>
        <Link
          to="/app/explore"
          className="animated-link mt-4 inline-block text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go to Explore
        </Link>
      </section>
    );
  }

  // No current part
  if (!currentPart) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-premium">
        <h1 className="text-xl font-semibold">No parts found</h1>
        <p className="mt-2 text-sm text-muted">No alternatives found in this MS group.</p>
      </section>
    );
  }

  const priceRange = currentPart.price_range;
  const selectedRegionPrice = currentPart.unit_price;
  const oemSummary = currentPart.oem_summary;

  return (
    <motion.div id="export-content"
      key={`${currentPart.leoni_part_number}-${filters.region}-${filters.snapshot}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3.5"
    >
      {/* HEADER */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-premium">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3.5">
            <div className="min-w-0 flex-1">
              <h1 className="text-[29px] font-semibold tracking-[-0.03em] text-text sm:text-[31px]">
                Part Alternative Analysis
              </h1>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-border/80 bg-bg/70 px-3 py-1 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                  Part Number: <span className="font-mono">{currentPart.leoni_part_number}</span>
                </span>
                <span className="rounded-full border border-border/80 bg-bg/70 px-3 py-1 text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                  MS Number: {data.ms_number}
                </span>
              </div>

              <p className="mt-2.5 text-sm leading-6 text-muted lg:whitespace-nowrap">
                Open by MS number to compare alternatives, review price-to-price preview, and prepare a business case.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <Button
                type="button"
                variant="secondary"
                className="h-8 w-auto rounded-full border-border/80 bg-bg/75 px-3 text-[12px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                onClick={() => navigate(`/app/m1/part?query=${encodeURIComponent(currentPart.leoni_part_number)}`)}
              >
                Open technical view
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-8 w-auto rounded-full border-border/80 bg-bg/75 px-3 text-[12px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                onClick={() => navigate(`/app/m2/part?query=${encodeURIComponent(currentPart.leoni_part_number)}`)}
              >
                Open commercial view
              </Button>
            </div>
          </div>

          <div className="relative mt-4 rounded-xl border border-border/70 bg-bg/20 px-3.5 py-2.5 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Filter behavior on this page</h2>
              <span className="rounded-full border border-border/70 bg-surface/85 px-2.5 py-1 text-[11px] font-medium text-muted">
                Snapshot: {filters.snapshot}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1.5 text-[12px] text-muted">
              <p className="rounded-full border border-border/60 bg-surface/75 px-2.5 py-1">
                <span className="font-semibold text-text">Applied:</span> Region, Snapshot
              </p>
              <p className="rounded-full border border-border/60 bg-surface/75 px-2.5 py-1">
                Analysis stays within the selected MS group alternatives
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SELECTED PART SUMMARY */}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-premium sm:p-5">
        <h3 className="text-base font-semibold">Selected Part Summary</h3>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="flex min-h-[7rem] flex-col rounded-xl border border-border bg-gradient-to-b from-bg/45 to-bg/15 p-3.5">
            <p className="text-xs text-muted">Supplier</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{currentPart.supplier_group}</p>
          </div>
          <div className="flex min-h-[7rem] flex-col rounded-xl border border-border bg-gradient-to-b from-bg/45 to-bg/15 p-3.5">
            <p className="text-xs text-muted">Compatibility attribute</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{currentPart.compatibility_status || "-"}</p>
          </div>
          <div className="flex min-h-[7rem] flex-col rounded-xl border border-primary/15 bg-gradient-to-b from-primary/[0.05] to-bg/15 p-3.5">
            <p className="text-xs text-muted">Unit price ({filters.region})</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              {selectedRegionPrice === null || selectedRegionPrice === undefined
                ? "No price in selected region"
                : formatCurrency(selectedRegionPrice)}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Regional range: {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)} across active regions
            </p>
          </div>
          <div className="flex min-h-[7rem] flex-col rounded-xl border border-border bg-gradient-to-b from-bg/45 to-bg/15 p-3.5">
            <p className="text-xs text-muted">Annual volume</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              {currentPart.annual_volume.toLocaleString("en-US")}
            </p>
          </div>
          <div className="flex min-h-[7rem] flex-col rounded-xl border border-border bg-gradient-to-b from-bg/45 to-bg/15 p-3.5">
            <p className="text-xs text-muted">Contact system</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              {currentPart.fors_material_group || "-"}
            </p>
          </div>
          <div className="flex min-h-[7rem] flex-col rounded-xl border border-border bg-gradient-to-b from-bg/45 to-bg/15 p-3.5">
            <p className="text-xs text-muted">OEM release coverage</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-primary">
              {oemSummary.percentage}% released
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {oemSummary.released} of {oemSummary.total} OEMs released
            </p>
          </div>
        </div>
      </section>

      {/* ALTERNATIVES TABLE */}
      <section className="rounded-2xl border border-border bg-surface p-0 shadow-premium">
        <div className="border-b border-border px-5 py-3.5">
          <h3 className="text-base font-semibold">Alternatives (MS group)</h3>
        </div>
        <AlternativesTable
          alternatives={data.alternatives}
          currentPartNumber={currentPart.leoni_part_number}
          targetPartNumber={targetPartNumber}
          onTargetChange={setTargetPartNumber}
        />
      </section>

      {/* VOLUME CHARTS */}
      <VolumeCharts
        volumeShare={data.volume_share}
        volumeByRegion={data.volume_by_region}
      />

      {/* PRICE PREVIEW */}
      <PricePreview
        msNumber={data.ms_number}
        currentPart={currentPart}
        targetPart={targetPart}
        selectedRegion={filters.region}
        snapshot={filters.snapshot}
      />
    </motion.div>
  );
}