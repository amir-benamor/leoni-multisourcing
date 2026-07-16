import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_FILTERS, EXPLORE_CUSTOMER_OPTIONS, type GlobalFiltersState } from "../components/shell/filterConfig";

export type Filters = {
  customer: string;
  region: "EMEA" | "AMERICAS" | "CHINA" | "ASIA";  // ← AJOUTER "ASIA"
  plant: string;
  project: string;
  family: string;
  suppliers: string[];
  snapshot: string;
};

interface FiltersContextValue {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<GlobalFiltersState>>;
  reset: () => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

function isM3CustomerRoute(pathname: string) {
  return (
    pathname.startsWith("/app/m3") ||
    pathname.startsWith("/app/m3/component") ||
    pathname.startsWith("/app/component") ||
    pathname.startsWith("/app/ms") ||
    pathname.startsWith("/app/dashboard") ||
    pathname.startsWith("/app/explore") ||
    pathname.startsWith("/app/business-case")
  );
}

export function FiltersProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isM3Route = isM3CustomerRoute(location.pathname);
  const [filters, setFilters] = useState<GlobalFiltersState>(() =>
    isM3Route
      ? { ...DEFAULT_FILTERS, customer: EXPLORE_CUSTOMER_OPTIONS[0] }
      : DEFAULT_FILTERS
  );

  useEffect(() => {
    if (isM3Route) {
      if (!EXPLORE_CUSTOMER_OPTIONS.includes(filters.customer as (typeof EXPLORE_CUSTOMER_OPTIONS)[number])) {
        setFilters((current) => ({ ...current, customer: EXPLORE_CUSTOMER_OPTIONS[0] }));
      }
      return;
    }

    if (filters.customer !== "LEONI" && filters.customer !== "All Customers") {
      setFilters((current) => ({ ...current, customer: DEFAULT_FILTERS.customer }));
    }
  }, [filters.customer, isM3Route]);

  const effectiveFilters = useMemo(() => {
    if (isM3Route) {
      const exploreCustomer = EXPLORE_CUSTOMER_OPTIONS.includes(filters.customer as (typeof EXPLORE_CUSTOMER_OPTIONS)[number])
        ? filters.customer
        : EXPLORE_CUSTOMER_OPTIONS[0];
      return { ...filters, customer: exploreCustomer };
    }

    const defaultCustomer = filters.customer === "LEONI" || filters.customer === "All Customers"
      ? filters.customer
      : DEFAULT_FILTERS.customer;
    return { ...filters, customer: defaultCustomer };
  }, [filters, isM3Route]);

  const value = useMemo(
    () => ({
      filters: effectiveFilters,
      setFilters,
      reset: () => setFilters(isM3Route ? { ...DEFAULT_FILTERS, customer: EXPLORE_CUSTOMER_OPTIONS[0] } : DEFAULT_FILTERS),
    }),
    [effectiveFilters, isM3Route]
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useFilters must be used within FiltersProvider");
  }
  return context;
}