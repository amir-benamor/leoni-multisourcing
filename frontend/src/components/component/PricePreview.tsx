import { useNavigate } from "react-router-dom";
import { AlternativePart } from "../../services/alternativeApi";
import { Button } from "../ui/Button";

function formatUnitPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

interface PricePreviewProps {
  msNumber: string;
  currentPart: AlternativePart;
  targetPart: AlternativePart | null;
  selectedRegion: string;
  snapshot: string;
}

export function PricePreview({ msNumber, currentPart, targetPart, selectedRegion, snapshot }: PricePreviewProps) {
  const navigate = useNavigate();

  const currentRegionPrice = currentPart.unit_price;
  const targetRegionPrice = targetPart?.unit_price ?? null;
  
  // Delta = Current - Target (positif = économie)
  const delta =
    targetPart && currentRegionPrice !== null && targetRegionPrice !== null 
      ? currentRegionPrice - targetRegionPrice 
      : null;
      
  // Saving = Delta × Volume current
  const saving =
    targetPart && delta !== null
      ? delta * currentPart.annual_volume
      : null;
      
  const canCreateBusinessCase = Boolean(targetPart) && saving !== null && saving > 0;
  
  const currentRange = currentPart.price_range;
  const targetRange = targetPart?.price_range ?? null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-premium sm:p-5">
      <h3 className="text-base font-semibold">Price-to-Price Preview</h3>
      <p className="mt-1 text-sm text-muted">
        Based on selected region: {selectedRegion} <span className="text-muted/70">| Snapshot {snapshot}</span>
      </p>

      <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex min-h-[7rem] flex-col rounded-xl border border-border bg-gradient-to-b from-bg/45 to-bg/15 p-3.5">
          <p className="text-xs text-muted">Current unit price</p>
          <p className="mt-1 text-sm font-medium">{currentPart.supplier_group}</p>
          <p className="mt-1 text-base font-semibold tracking-tight">
            {currentRegionPrice === null || currentRegionPrice === undefined
              ? "No price in selected region"
              : formatUnitPrice(currentRegionPrice)}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Regional range: {formatUnitPrice(currentRange.min)} - {formatUnitPrice(currentRange.max)}
          </p>
        </div>

        <div className="flex min-h-[7rem] flex-col rounded-xl border border-border bg-gradient-to-b from-bg/45 to-bg/15 p-3.5">
          <p className="text-xs text-muted">Target unit price</p>
          <p className="mt-1 text-sm font-medium">{targetPart?.supplier_group ?? "-"}</p>
          <p className="mt-1 text-base font-semibold tracking-tight">
            {targetPart
              ? targetRegionPrice === null || targetRegionPrice === undefined
                ? "No price in selected region"
                : formatUnitPrice(targetRegionPrice)
              : "-"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {targetRange
              ? `Regional range: ${formatUnitPrice(targetRange.min)} - ${formatUnitPrice(targetRange.max)}`
              : "Select a target part"}
          </p>
        </div>

        <div className="flex min-h-[7rem] flex-col rounded-xl border border-primary/15 bg-gradient-to-b from-primary/[0.05] to-bg/15 p-3.5">
          <p className="text-xs text-muted">Delta price</p>
          <p className="mt-1 text-base font-semibold tracking-tight text-primary">
            {targetPart
              ? delta === null
                ? "No price in selected region"
                : `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${formatUnitPrice(Math.abs(delta))}`
              : "-"}
          </p>
        </div>

        <div className="flex min-h-[7rem] flex-col rounded-xl border border-border bg-gradient-to-b from-bg/45 to-bg/15 p-3.5">
          <p className="text-xs text-muted">Current annual volume</p>
          <p className="mt-1 text-base font-semibold tracking-tight">
            {new Intl.NumberFormat("en-US").format(currentPart.annual_volume)}
          </p>
        </div>

        <div className="flex min-h-[7rem] flex-col rounded-xl border border-border bg-gradient-to-b from-bg/45 to-bg/15 p-3.5">
          <p className="text-xs text-muted">Estimated annual saving</p>
          <p className="mt-1 text-base font-semibold tracking-tight">
            {targetPart 
              ? (saving === null ? "No price in selected region" : formatValue(Math.abs(saving)))
              : "-"}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {!targetPart ? <p className="text-sm text-muted">Select a target alternative.</p> : null}
          {targetPart && !canCreateBusinessCase ? (
            <p className="text-sm text-muted">A region-specific price is required for both current and target parts.</p>
          ) : null}
        </div>
        <Button
          type="button"
          className="h-9 w-auto shrink-0 px-4"
          disabled={!canCreateBusinessCase}
          onClick={() => {
            if (!targetPart || !canCreateBusinessCase) return;
            navigate(
              `/app/m3/business-case?ms=${encodeURIComponent(msNumber)}&currentPn=${encodeURIComponent(currentPart.leoni_part_number)}&targetPn=${encodeURIComponent(targetPart.leoni_part_number)}`
            );
          }}
        >
          Create business case
        </Button>
      </div>
    </section>
  );
}