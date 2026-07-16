import { motion } from "framer-motion";
import { CHART_POINTS } from "../../lib/constants";

function toPath(points: number[]) {
  const width = 240;
  const height = 80;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function MiniChart() {
  const path = toPath(CHART_POINTS);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <h3 className="text-sm font-medium text-white/90">Sourcing Stability</h3>
        <span className="text-xs text-white/70">Last 8 weeks</span>
      </div>
      <svg viewBox="0 0 240 100" className="w-full" role="img" aria-label="Sourcing trend mini chart">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9dd3ff" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(157,211,255,0.32)" />
            <stop offset="100%" stopColor="rgba(157,211,255,0.02)" />
          </linearGradient>
        </defs>
        <path d={`${path} L240,100 L0,100 Z`} fill="url(#areaGradient)" />
        <motion.path
          d={path}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="flex items-end gap-1.5">
        {CHART_POINTS.slice(-6).map((point, index) => (
          <motion.div
            key={index}
            initial={{ height: 0, opacity: 0.5 }}
            animate={{ height: `${Math.max(12, point * 0.7)}%`, opacity: 1 }}
            transition={{ delay: index * 0.06, duration: 0.4 }}
            className="w-full rounded-t bg-white/25"
          />
        ))}
      </div>
    </div>
  );
}
