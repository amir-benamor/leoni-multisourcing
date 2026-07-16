import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { exploreApi, CoverageKpi } from "../../services/exploreApi";

interface CoverageKpisProps {
  customer: string;
  region: string;
  materialGroup: string;
}

const toneClasses: Record<string, string> = {
  neutral: "border-border bg-surface",
  critical: "border-rose-500/20 bg-rose-500/5",
  positive: "border-emerald-500/20 bg-emerald-500/5",
};

const accentClasses: Record<string, string> = {
  neutral: "bg-slate-500/70",
  critical: "bg-rose-500/80",
  positive: "bg-emerald-500/80",
};

export function CoverageKpis({ customer, region, materialGroup }: CoverageKpisProps) {
  const reduceMotion = useReducedMotion();
  const [kpis, setKpis] = useState<CoverageKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoverage = async () => {
      if (!customer || !region) return;

      setLoading(true);
      setError(null);

      try {
        const result = await exploreApi.getCoverageKpis(customer, region, materialGroup);
        
        if (result.success && result.data) {
          setKpis(result.data.coverage_kpis);
        } else {
          setError(result.error || 'Failed to load coverage data');
        }
      } catch (err) {
        console.error('Error fetching coverage KPIs:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCoverage();
  }, [customer, region, materialGroup]);

  // Affichage pendant le chargement
  if (loading) {
    return (
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Coverage KPIs">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-4 shadow-sm animate-pulse">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-slate-300" />
              <div className="flex-1">
                <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                <div className="h-8 w-12 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-36 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </section>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-center">
        <p className="text-sm text-rose-600">Failed to load coverage KPIs</p>
        <p className="text-xs text-muted mt-1">{error}</p>
      </section>
    );
  }

  // Pas de données
  if (kpis.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4 text-center">
        <p className="text-sm text-muted">No coverage data available for the selected filters</p>
      </section>
    );
  }

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Coverage KPIs">
      {kpis.map((item, index) => (
        <motion.article
          key={item.key}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : index * 0.04, duration: reduceMotion ? 0.01 : 0.25 }}
          whileHover={reduceMotion ? undefined : { y: -2 }}
          className={cn("rounded-2xl border p-4 shadow-sm", toneClasses[item.tone])}
        >
          <div className="flex items-start gap-3">
            <span className={cn("mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full", accentClasses[item.tone])} aria-hidden="true" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{item.label}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-text">{item.value}</p>
              <p className="mt-2 text-sm text-muted">{item.helper}</p>
            </div>
          </div>
        </motion.article>
      ))}
    </section>
  );
}