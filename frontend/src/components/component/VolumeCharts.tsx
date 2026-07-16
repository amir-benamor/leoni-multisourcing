import { motion } from "framer-motion";
import { VolumeShare, VolumeRegion } from "../../services/alternativeApi";

interface VolumeChartsProps {
  volumeShare: VolumeShare[];
  volumeByRegion: VolumeRegion[];
}

function maxValue(data: { value: number }[]) {
  return data.reduce((max, item) => Math.max(max, item.value), 0) || 1;
}

function ChartBlock({ title, suffix = "", data }: { title: string; suffix?: string; data: { name: string; value: number }[] }) {
  const max = maxValue(data);

  return (
    <section className="flex h-full min-h-[17rem] flex-col rounded-2xl border border-border bg-surface p-4 shadow-premium">
      <div className="min-h-[3rem]">
        <h4 className="text-sm font-semibold tracking-tight text-text">{title}</h4>
        <p className="mt-1 text-[11px] text-muted">Current MS-group split for the selected part context.</p>
      </div>
      <div className="mt-3 space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="rounded-xl border border-border/70 bg-bg/20 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3 text-xs text-muted">
              <span className="font-medium text-text">{item.name}</span>
              <span className="font-semibold tabular-nums text-text">
                {item.value.toLocaleString("en-US")}
                {suffix}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-bg/80">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / max) * 100}%` }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function VolumeCharts({ volumeShare, volumeByRegion }: VolumeChartsProps) {
  const shareData = volumeShare.map((item) => ({
    name: item.supplier,
    value: item.percentage,
  }));

  const regionData = volumeByRegion.map((item) => ({
    name: item.region,
    value: item.volume,
  }));

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <ChartBlock title="Volume share (%)" suffix="%" data={shareData} />
      <ChartBlock title="Volume units" data={regionData} />
    </section>
  );
}