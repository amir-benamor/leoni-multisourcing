import { motion } from "framer-motion";
import { ArrowLeft, BadgeEuro, BarChart3, MapPinned, PackageSearch, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { m2Api, M2PartData, M2BreakdownItem } from "../../services/m2Api";

const RECENT_SEARCHES_KEY = "ASAP_M2_PART_RECENT_SEARCHES";

function readRecentSearches() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUnitPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatFullPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function BreakdownBlock({
  title,
  items,

}: {
  title: string;
  items: M2BreakdownItem[];
  totalVolume: number;
  totalValue: number;
}) {
  if (!items || items.length === 0) {
    return (
      <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="mt-3 text-sm text-muted">No data available</p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          return (
            <div key={item.name} className="rounded-xl border border-border/70 bg-bg/40 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{item.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatNumber(item.volume)} units</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-text">{item.percentage}%</p>
                  <p className="mt-0.5 text-xs text-muted">{formatCurrency(item.value)}</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${item.percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function M2PartPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("query")?.trim() ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // États pour les données API
  const [partData, setPartData] = useState<M2PartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchType, setMatchType] = useState<"LEONI PN" | "Supplier PN" | null>(null);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Charger les données depuis l'API
  useEffect(() => {
    const fetchPartData = async () => {
      if (!urlQuery) {
        setPartData(null);
        setError(null);
        setMatchType(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await m2Api.getPartCommercial(urlQuery);

        if (result.success && result.data) {
          setPartData(result.data);
          // Déterminer le type de correspondance
          if (result.data.part_info.leoni_part_number === urlQuery) {
            setMatchType("LEONI PN");
          } else {
            setMatchType("Supplier PN");
          }
        } else {
          setPartData(null);
          setError(result.error || "Part not found");
        }
      } catch (err) {
        console.error("Error fetching commercial data:", err);
        setPartData(null);
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPartData();
  }, [urlQuery]);

  const saveRecentSearch = (value: string) => {
    const nextValue = value.trim();
    if (!nextValue || typeof window === "undefined") return;

    const nextRecent = [nextValue, ...recentSearches.filter((item) => item !== nextValue)].slice(0, 5);
    setRecentSearches(nextRecent);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecent));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;
    saveRecentSearch(normalizedQuery);
    setSearchParams({ query: normalizedQuery });
  };

  const openRecentSearch = (search: string) => {
    setQuery(search);
    saveRecentSearch(search);
    setSearchParams({ query: search });
  };

  // Afficher le loader pendant le chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted">Loading commercial data...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-6xl space-y-4"
    >
      <header className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <BadgeEuro className="h-3.5 w-3.5" aria-hidden="true" />
          M2 - One Part
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text sm:text-3xl">Part Commercial Overview</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
          Commercial reading of one part by LEONI PN or Supplier PN, focused on regional price context, volume exposure,
          and value visibility for the selected supplier part.
        </p>
        <nav aria-label="M2 part actions" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            onClick={() => navigate("/app/m2")}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to M2
          </button>
          {[
            ["Parts List", "/app/m2/parts"],
            ["Material Group", "/app/m2/material-group"],
            ["Supplier Analysis", "/app/m2/supplier"],
          ].map(([label, href]) => (
            <button
              key={href}
              type="button"
              onClick={() => navigate(href)}
              className="rounded-md px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <Input
              id="m2-part-query"
              label="Search by LEONI PN or Supplier PN"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter LEONI PN or Supplier PN"
              hint="Open one commercial part view with regional price, volume, and value context."
              rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
            />
          </div>
          <div className="flex w-full sm:w-auto">
            <Button type="submit" className="sm:w-auto sm:min-w-[150px] sm:px-5" disabled={!query.trim() || loading}>
              Open part
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent searches</p>
          {recentSearches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => openRecentSearch(item)}
                  className="rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No recent searches yet.</p>
          )}
        </div>
      </section>

      {!urlQuery ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center shadow-sm">
          <PackageSearch className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-text">Start with one part</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Search by LEONI PN or Supplier PN to open the commercial view. The page will show regional price context,
            annual volume exposure, and value calculated from unit price times volume.
          </p>
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text">No commercial record found</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No commercial data matches <span className="font-mono font-medium text-text">{urlQuery}</span>.
          </p>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">{error}</p>
        </section>
      ) : partData ? (
        <>
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    Match: {matchType ?? "LEONI PN"}
                  </span>
                  <span className="rounded-full border border-border bg-bg px-2.5 py-1 text-xs font-medium text-muted">
                    One supplier part
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-text">{partData.part_info.leoni_part_number}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{partData.part_info.s4_description || "No description available"}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="sm:w-auto sm:px-4"
                onClick={() => navigate(`/app/m1/part?query=${encodeURIComponent(partData.part_info.leoni_part_number)}`)}
              >
                Open technical view
              </Button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Supplier PN", partData.part_info.supplier_part_number || "-"],
                ["Supplier", partData.part_info.supplier_group || "-"],
                ["Material group", partData.part_info.fors_material_group || "-"],
                ["Classification", partData.part_info.fors_classification || "Not available"],
                ["Price range", `${formatUnitPrice(partData.price_range.min)} - ${formatUnitPrice(partData.price_range.max)}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border/70 bg-bg/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-text">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Total volume", value: `${formatNumber(partData.total_volume)} units`, icon: PackageSearch },
              { label: "Total value", value: formatCurrency(partData.total_value), icon: BadgeEuro },
              { label: "Active regions", value: String(partData.active_regions), icon: MapPinned },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex rounded-xl border border-primary/15 bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold text-text">{item.value}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full border border-primary/15 bg-primary/10 p-2 text-primary">
                <BadgeEuro className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-text">Commercial reading signals</h2>
                <p className="mt-1 text-sm text-muted">Compact signals derived from the selected part data.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [
                  "Top value region",
                  partData.signals.top_value_region?.region ?? "-",
                  partData.signals.top_value_region ? formatCurrency(partData.signals.top_value_region.value || 0) : "-",
                ],
                [
                  "Highest unit price region",
                  partData.signals.highest_unit_price_region?.region ?? "-",
                  partData.signals.highest_unit_price_region ? formatUnitPrice(partData.signals.highest_unit_price_region.unit_price || 0) : "-",
                ],
                ["Dominant plant", partData.signals.dominant_plant?.name ?? "-", partData.signals.dominant_plant ? `${partData.signals.dominant_plant.percentage}% of volume` : "-"],
                [
                  "Dominant project",
                  partData.signals.dominant_project?.name ?? "-",
                  partData.signals.dominant_project ? `${partData.signals.dominant_project.percentage}% of volume` : "-",
                ],
              ].map(([label, value, detail]) => (
                <article key={label} className="rounded-xl border border-border/70 bg-bg/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-text">{value}</p>
                  <p className="mt-0.5 text-xs text-muted">{detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full border border-primary/15 bg-primary/10 p-2 text-primary">
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-text">Regional commercial view</h2>
                <p className="mt-1 text-sm text-muted">Value is calculated as unit price x regional volume.</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-3 py-3">Region</th>
                    <th className="px-3 py-3">Price source server</th>
                    <th className="px-3 py-3 text-right">Unit price</th>
                    <th className="px-3 py-3 text-center">Crcy</th>
                    <th className="px-3 py-3 text-right">Unit price €</th>
                    <th className="px-3 py-3 text-right">Volume</th>
                    <th className="px-3 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {partData.regional_data.map((row) => (
                    <tr key={row.region} className="text-text">
                      <td className="px-3 py-3 font-medium">{row.region}</td>
                      <td className="px-3 py-3 text-sm text-muted">{row.price_source_server || "—"}</td>
                      {/* Unit price = full_price (prix original dans sa devise) */}
                      <td className="px-3 py-3 text-right font-mono">
                        {row.full_price !== null && row.full_price !== undefined 
                          ? formatFullPrice(row.full_price) 
                          : "0.0000"}
                       </td>
                      {/* Crcy = currency (devise originale) */}
                      <td className="px-3 py-3 text-center text-sm text-muted font-medium">
                        {row.currency || "—"}
                       </td>
                      {/* Unit price € = price_eur (prix en euros) */}
                      <td className="px-3 py-3 text-right font-mono">
                        {row.unit_price !== null && row.unit_price !== undefined 
                          ? row.unit_price.toFixed(2) 
                          : "0.00"}
                       </td>
                      <td className="px-3 py-3 text-right">{formatNumber(row.volume)}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatCurrency(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <BreakdownBlock 
              title="Project breakdown" 
              items={partData.breakdowns.project_breakdown} 
              totalVolume={partData.total_volume} 
              totalValue={partData.total_value} 
            />
            <BreakdownBlock 
              title="Account breakdown" 
              items={partData.breakdowns.account_breakdown} 
              totalVolume={partData.total_volume} 
              totalValue={partData.total_value} 
            />
            <BreakdownBlock 
              title="Plant breakdown" 
              items={partData.breakdowns.plant_breakdown} 
              totalVolume={partData.total_volume} 
              totalValue={partData.total_value} 
            />
          </section>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => navigate("/app/m2")}
        className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-text transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to M2
      </button>
    </motion.section>
  );
}