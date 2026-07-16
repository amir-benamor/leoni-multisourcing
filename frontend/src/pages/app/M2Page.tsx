import { motion } from "framer-motion";
import {
  BadgeEuro,
  Boxes,
  Building2,
  ChevronRight,
  ListFilter,
  PackageSearch,
  Search,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

type EntryCard = {
  title: string;
  description: string;
  cta: string;
  icon: typeof PackageSearch;
  href: string;
};

const RECENT_SEARCHES_KEY = "ASAP_M2_RECENT_SEARCHES";


const ENTRY_CARDS: EntryCard[] = [
  {
    title: "One Part",
    description: "Review regional price context, volume exposure, and value signals for one selected part.",
    cta: "Open one-part view",
    icon: PackageSearch,
    href: "/app/m2/part",
  },
  {
    title: "List of Parts",
    description: "Read commercial signals across a selected list of parts, including volume and value concentration.",
    cta: "Open list workflow",
    icon: ListFilter,
    href: "/app/m2/parts",
  },
  {
    title: "Material Group",
    description: "Compare spend visibility, regional price context, and value concentration by material group.",
    cta: "Open material group view",
    icon: Boxes,
    href: "/app/m2/material-group",
  },
  {
    title: "Supplier Commercial Analysis",
    description: "Review supplier value, part coverage, regional exposure, and commercial portfolio signals.",
    cta: "Open supplier analysis",
    icon: Building2,
    href: "/app/m2/supplier",
  },
];

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

export default function M2Page() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  const saveRecentSearch = (value: string) => {
    const nextValue = value.trim();
    if (!nextValue || typeof window === "undefined") return;

    const nextRecent = [nextValue, ...recentSearches.filter((item) => item !== nextValue)].slice(0, 5);
    setRecentSearches(nextRecent);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecent));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedQuery) return;
    saveRecentSearch(normalizedQuery);
    navigate(`/app/m2/part?query=${encodeURIComponent(normalizedQuery)}`);
  };

  const openSinglePart = (value: string) => {
    const nextValue = value.trim();
    if (!nextValue) return;
    saveRecentSearch(nextValue);
    navigate(`/app/m2/part?query=${encodeURIComponent(nextValue)}`);
  };

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
          Module M2
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text sm:text-3xl">Parts Commercial Data</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
          Commercial views for parts, lists, material groups, and supplier portfolios. Use this module to read regional
          price context, volume exposure, value concentration, and spend visibility across the parts landscape.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <Input
              id="m2-commercial-search"
              label="Search by LEONI PN or Supplier PN"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter LEONI PN or Supplier PN"
              hint="Use this quick entry to focus the commercial view on one part."
              rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
            />
          </div>
          <div className="flex w-full sm:w-auto">
            <Button type="submit" className="sm:w-auto sm:min-w-[150px] sm:px-5" disabled={!normalizedQuery}>
              Open commercial view
            </Button>
          </div>
        </form>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent searches</p>
            {recentSearches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => openSinglePart(item)}
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
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ENTRY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => navigate(card.href)}
              className="group flex min-h-[246px] flex-col rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <ChevronRight className="h-4 w-4 text-muted transition-colors group-hover:text-primary" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-text">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{card.description}</p>
              <p className="mt-auto pt-5 text-sm font-medium text-primary">{card.cta}</p>
            </button>
          );
        })}
      </section>
    </motion.section>
  );
}