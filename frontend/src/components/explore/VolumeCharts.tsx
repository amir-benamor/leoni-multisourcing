import { useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { exploreApi } from "../../services/exploreApi";

interface VolumeChartsProps {
  customer: string;
  region: string;
  materialGroup: string;
  supplierVolumeTitle: string;
  supplierVolumeHelper: string;
}

function formatVolumeTick(value: number) {
  if (value < 1_000_000) {
    return `${Math.round(value / 1_000)}K`;
  }

  const millions = value / 1_000_000;
  return Number.isInteger(millions) ? `${millions.toFixed(0)}M` : `${millions.toFixed(1)}M`;
}

function formatFullUnits(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} units`;
}

function TooltipCard({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit: "compact" | "full";
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-50">
      <p className="font-medium">{label}</p>
      <p className="mt-1">{unit === "full" ? formatFullUnits(payload[0].value) : formatVolumeTick(payload[0].value)}</p>
    </div>
  );
}

export function VolumeCharts({
  customer,
  region,
  materialGroup,
  supplierVolumeTitle,
  supplierVolumeHelper,
}: VolumeChartsProps) {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!customer || !region) return;

      setLoading(true);
      setError(null);

      try {
        const result = await exploreApi.getMarketShare(customer, region, materialGroup);

        if (result.success && result.data) {
          setData(result.data.supplier_volume);
        } else {
          setError(result.error || 'Failed to load volume data');
        }
      } catch (err) {
        console.error('Error fetching volume data:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customer, region, materialGroup]);

  const orderedSupplierVolumeData = [...data]
    .filter((entry) => entry.name !== "Others" || entry.value >= 300000)
    .sort((a, b) => b.value - a.value);

  // Loading state
  if (loading) {
    return (
      <article className="flex h-full min-h-[24.5rem] flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="min-h-[4.75rem] min-w-0 animate-pulse">
          <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
          <div className="h-5 w-48 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-200 rounded" />
        </div>
        <div className="mt-4 h-[19rem] animate-pulse flex items-center justify-center">
          <div className="h-32 w-full bg-slate-100 rounded-xl" />
        </div>
      </article>
    );
  }

  // Error state
  if (error) {
    return (
      <article className="flex h-full min-h-[24.5rem] flex-col rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Annual volume</p>
        <h3 className="mt-1 text-base font-semibold text-text">{supplierVolumeTitle}</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-rose-600">Failed to load volume data</p>
        </div>
      </article>
    );
  }

  // Empty state
  if (orderedSupplierVolumeData.length === 0) {
    return (
      <article className="flex h-full min-h-[24.5rem] flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Annual volume</p>
        <h3 className="mt-1 text-base font-semibold text-text">{supplierVolumeTitle}</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted">No volume data available</p>
        </div>
      </article>
    );
  }

  return (
    <article className="flex h-full min-h-[24.5rem] flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="min-h-[4.75rem] min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Annual volume</p>
        <h3 className="mt-1 max-w-[18rem] text-base font-semibold leading-snug text-text">{supplierVolumeTitle}</h3>
        <p className="mt-1 max-w-[24rem] text-xs leading-5 text-muted">{supplierVolumeHelper}</p>
      </div>

      <div className="mt-4 h-[19rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={orderedSupplierVolumeData} margin={{ top: 8, right: 12, left: 6, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
            <XAxis
              dataKey="name"
              tick={{ fill: "currentColor", fontSize: 11 }}
              tickMargin={8}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatVolumeTick}
              tick={{ fill: "currentColor", fontSize: 11 }}
              tickMargin={6}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip content={<TooltipCard unit="full" />} cursor={{ fill: "rgba(13,110,130,0.08)" }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900}>
              {orderedSupplierVolumeData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={index === 0 ? "#0f766e" : index === 1 ? "rgba(13,148,136,0.72)" : "rgba(15,118,110,0.38)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}