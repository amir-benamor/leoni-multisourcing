import { motion } from "framer-motion";
import { Boxes, ChevronRight, Layers3, ListFilter, PackageSearch, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

const RECENT_SEARCHES_KEY = "ASAP_M1_RECENT_SEARCHES";


type EntryCard = {
  title: string;
  description: string;
  icon: typeof PackageSearch;
  href: string;
  cta: string;
};

const ENTRY_CARDS: EntryCard[] = [
  {
    title: "One Part",
    description: "Open one part using LEONI PN or Supplier PN.",
    icon: PackageSearch,
    href: "/app/m1/part",
    cta: "Open one part",
  },
  {
    title: "Parts List",
    description: "Analyze a list of parts.",
    icon: ListFilter,
    href: "/app/m1/parts",
    cta: "Open list workflow",
  },
  {
    title: "Material Group",
    description: "Explore parts by material group (example MQS 0.64).",
    icon: Boxes,
    href: "/app/m1/material-group",
    cta: "Browse groups",
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

export default function M1Page() {
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

  const openSinglePart = (value: string) => {
    const nextValue = value.trim();
    if (!nextValue) return;
    saveRecentSearch(nextValue);
    navigate(`/app/m1/part?query=${encodeURIComponent(nextValue)}`);
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
          <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
          Module M1
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-text sm:text-3xl">Parts Data</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
          Technical consultation of parts data. Start from one part, a list of parts, or a material group to open the
          relevant Parts Data workflow.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <Input
              id="m1-parts-search"
              label="Search by LEONI PN or Supplier PN"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter LEONI PN or Supplier PN"
              hint="Use this quick entry to open one part directly."
              rightAdornment={<Search className="h-4 w-4 text-muted" aria-hidden="true" />}
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              className="sm:w-auto sm:px-5"
              disabled={!normalizedQuery}
              onClick={() => openSinglePart(normalizedQuery)}
            >
              Open part
            </Button>
          </div>
        </div>

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

      <section className="grid gap-4 lg:grid-cols-3">
        {ENTRY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => navigate(card.href)}
              className="group rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <ChevronRight className="h-4 w-4 text-muted transition-colors group-hover:text-primary" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-text">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{card.description}</p>
              <p className="mt-4 text-sm font-medium text-primary">{card.cta}</p>
            </button>
          );
        })}
      </section>
    </motion.section>
  );
}