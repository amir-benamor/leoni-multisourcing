import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SupplierChartDatum, SupplierStatusDatum } from "../../data/mockSupplierDetail";
import { formatNumber, formatPercent } from "../../lib/format";

interface SupplierChartsProps {
  shareByRegion: SupplierChartDatum[];
  shareByCustomer: SupplierChartDatum[];
  statusCoverage: SupplierStatusDatum[];
  statusTotalParts: number;
  scopeLabel: string;
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
  unit: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-50">
      <p className="font-medium">{label}</p>
      <p className="mt-1">{Number(payload[0].value).toFixed(1)}{unit}</p>
    </div>
  );
}

export function SupplierCharts({
  shareByRegion,
  shareByCustomer,
  statusCoverage,
  statusTotalParts,
  scopeLabel,
}: SupplierChartsProps) {
  const totalParts = statusTotalParts || statusCoverage.reduce((acc, item) => acc + item.count, 0);

  return (
    <section className="grid gap-4 xl:grid-cols-3" aria-label="Supplier charts">
      <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text">Share by region</h3>
        <p className="mt-1 text-[11px] text-muted">Scope: {scopeLabel}</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shareByRegion} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} width={26} />
              <Tooltip cursor={{ fill: "rgba(21,98,224,0.08)" }} content={<TooltipCard unit="%" />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#1562e0" isAnimationActive animationDuration={850}>
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value) => formatPercent(Number(value ?? 0))}
                  className="fill-text text-[11px]"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text">Share by customer</h3>
        <p className="mt-1 text-[11px] text-muted">Scope: {scopeLabel}</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shareByCustomer} layout="vertical" margin={{ top: 4, right: 8, left: 14, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} tickLine={false} axisLine={false} width={72} />
              <Tooltip cursor={{ fill: "rgba(21,98,224,0.08)" }} content={<TooltipCard unit="%" />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="rgba(21,98,224,0.65)" isAnimationActive animationDuration={900}>
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(value) => formatPercent(Number(value ?? 0))}
                  className="fill-text text-[11px]"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text">Status coverage</h3>
        <p className="mt-1 text-[11px] text-muted">Scope: {scopeLabel}</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusCoverage}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={94}
                paddingAngle={2}
                isAnimationActive
                animationDuration={900}
              >
                {statusCoverage.map((segment) => (
                  <Cell key={segment.name} fill={segment.color} />
                ))}
              </Pie>
              <text x="50%" y="48%" textAnchor="middle" className="fill-muted text-[11px]">
                Total parts
              </text>
              <text x="50%" y="57%" textAnchor="middle" className="fill-text text-xl font-semibold">
                {formatNumber(totalParts)}
              </text>
              <Tooltip content={<TooltipCard unit="%" />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 space-y-1.5">
          {statusCoverage.map((segment) => (
            <div key={segment.name} className="flex items-center gap-2 text-xs text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
              <span>{segment.name}</span>
              <span className="ml-auto text-text">
                {formatPercent(segment.value)} ({formatNumber(segment.count)})
              </span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
