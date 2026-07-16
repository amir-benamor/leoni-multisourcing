import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { getDominantPartNumberByMs, suggest } from "../../data/mockComponentDetail";

const RECENT_SEARCHES_KEY = "ASAP_M3_RECENT_SEARCHES";

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

export default function SelectComponentPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  const normalized = query.trim();
  const isMSInput = normalized.toUpperCase().startsWith("MS");
  const suggestions = useMemo(() => suggest(normalized).slice(0, 8), [normalized]);

  const resolvedValue = useMemo(() => {
    if (!normalized) return "";
    const exactMatch = suggestions.find(
      (item) => item.type === (isMSInput ? "MS" : "PN") && item.value.toLowerCase() === normalized.toLowerCase()
    );
    if (exactMatch) return exactMatch.value;
    return isMSInput ? normalized.toUpperCase() : normalized;
  }, [isMSInput, normalized, suggestions]);

  const saveRecentSearch = (value: string) => {
    const nextValue = value.trim();
    if (!nextValue || typeof window === "undefined") return;

    const nextRecent = [nextValue, ...recentSearches.filter((item) => item !== nextValue)].slice(0, 5);
    setRecentSearches(nextRecent);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecent));
  };

  const handleOpen = (value?: string) => {
    const searchValue = value || resolvedValue;
    if (!searchValue) return;
    
    const nextValue = isMSInput ? getDominantPartNumberByMs(searchValue) ?? searchValue : searchValue;
    saveRecentSearch(searchValue);
    navigate(`/app/m3/component/${encodeURIComponent(nextValue)}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-premium sm:p-5">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Select Part</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          Search a part number or MS number to open Part Alternative Analysis.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-premium sm:p-5">
        <h2 className="text-base font-semibold">Search</h2>
        <p className="mt-1 text-xs text-muted">
          PN opens the exact part. MS opens the dominant part of that MS group.
        </p>
        <form
          className="mt-3 flex flex-col gap-3 md:flex-row md:items-start"
          onSubmit={(event) => {
            event.preventDefault();
            handleOpen();
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search PN or MS (e.g., TE-0.64-MS112-A1 or MS000112)"
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <Button type="submit" disabled={!normalized} className="h-11 w-auto px-4">
            {isMSInput ? "Open dominant part" : "Open part"}
          </Button>
        </form>

        {normalized && suggestions.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  key={`${item.type}-${item.value}`}
                  type="button"
                  onClick={() => setQuery(item.value)}
                  className="rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {item.type}: {item.value}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recent searches</p>
          {recentSearches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item) => {
                const isMS = item.toUpperCase().startsWith("MS");
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQuery(item);
                      const dominantPart = isMS ? getDominantPartNumberByMs(item) ?? item : item;
                      saveRecentSearch(item);
                      navigate(`/app/m3/component/${encodeURIComponent(dominantPart)}`);
                    }}
                    className="rounded-full border border-border bg-bg px-3 py-1 text-xs font-medium text-text transition-colors hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">No recent searches yet.</p>
          )}
        </div>
      </section>
    </motion.div>
  );
}