import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";
import { exploreApi, MsGroupItem } from "../../services/exploreApi";

interface ResultsGridProps {
  customer: string;
  region: string;
  materialGroup: string;
}

function AvailabilityBadge({ status, color }: { status: string; color: string }) {
  const colorClasses: Record<string, string> = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    blue: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    yellow: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    red: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    gray: "border-slate-300 bg-slate-100 text-slate-600 dark:text-slate-400",
  };

  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", colorClasses[color] || colorClasses.gray)}>
      {status}
    </span>
  );
}

export function ResultsGrid({ customer, region, materialGroup }: ResultsGridProps) {
  const navigate = useNavigate();
  const [msGroups, setMsGroups] = useState<MsGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!customer || !region) return;

      setLoading(true);
      setError(null);

      try {
        const result = await exploreApi.getResults(customer, region, materialGroup);

        if (result.success && result.data) {
          setMsGroups(result.data.ms_groups);
        } else {
          setError(result.error || 'Failed to load results');
        }
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [customer, region, materialGroup]);

  // Réinitialiser showAll quand les données changent
  useEffect(() => {
    setShowAll(false);
  }, [customer, region, materialGroup]);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return msGroups;
    const q = query.toLowerCase();
    return msGroups.filter((row) => row.ms_number.toLowerCase().includes(q));
  }, [msGroups, query]);

  // Top 10 ou tous selon showAll
  const displayedGroups = showAll ? filteredGroups : filteredGroups.slice(0, 10);
  const hasMore = filteredGroups.length > 10;

  // Loading state
  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm animate-pulse">
        <div className="h-5 w-24 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-48 bg-slate-200 rounded mb-4" />
        <div className="h-10 w-full max-w-sm bg-slate-200 rounded-xl mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text">Results</h3>
        <p className="mt-2 text-sm text-rose-600">Failed to load results: {error}</p>
      </section>
    );
  }

  // Empty state
  if (msGroups.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text">Results</h3>
        <p className="mt-2 text-sm text-muted">No MS groups found for the selected filters.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm" aria-label="Explore results">
      <div>
        <h3 className="text-sm font-semibold text-text">Results</h3>
        <p className="text-xs text-muted">Scoped multisourcing groups with availability status and total volume.</p>
      </div>

      <div className="mt-4">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Search results</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by MS Number"
            className="h-10 w-full rounded-xl border border-border bg-bg pl-9 pr-3 text-sm text-text transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-3 py-2 font-medium">MS Number</th>
              <th scope="col" className="px-3 py-2 font-medium">Alternatives</th>
              <th scope="col" className="px-3 py-2 font-medium">Best availability</th>
              <th scope="col" className="px-3 py-2 font-medium text-right">Total volume</th>
              <th scope="col" className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedGroups.map((row) => (
              <tr key={row.ms_number} className="border-b border-border/70 transition-colors hover:bg-primary/5">
                <td className="px-3 py-3 font-mono text-xs font-medium text-text">{row.ms_number}</td>
                <td className="px-3 py-3 text-muted">{row.alternatives}</td>
                <td className="px-3 py-3">
                  <AvailabilityBadge status={row.best_availability} color={row.best_availability_color} />
                </td>
                <td className="px-3 py-3 text-right text-muted">{row.total_volume.toLocaleString("en-US")}</td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/app/m3/component/${row.ms_number}`)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      View detail
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/app/m3/business-case?ms=${encodeURIComponent(row.ms_number)}`)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      Create business case
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View more / View less */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {showAll
              ? "View less"
              : `View more (${filteredGroups.length - 10} remaining)`}
          </button>
        </div>
      )}
    </section>
  );
}