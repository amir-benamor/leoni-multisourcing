// Types
export type Region = "EMEA" | "AMERICAS" | "CHINA" | "ASIA";

export type GlobalFiltersState = {
  customer: string;
  region: Region;
  plant: string;
  project: string;
  family: string;
  suppliers: string[];
  snapshot: string;
};

// Valeurs par défaut (fallback si API non disponible)
const DEFAULT_CUSTOMER_OPTIONS = ["BMW", "VW", "Stellantis", "Renault", "Tesla", "Mercedes-Benz"];

// Options dynamiques mises à jour depuis l'API
export let EXPLORE_CUSTOMER_OPTIONS: string[] = [...DEFAULT_CUSTOMER_OPTIONS];

// Options suppliers (pour le mode complet)
export const SUPPLIER_OPTIONS: string[] = ["TE", "APTIV", "MOLEX", "YAZAKI", "SUMITOMO"];

// Filtres par défaut
export const DEFAULT_FILTERS: GlobalFiltersState = {
  customer: "LEONI",
  region: "EMEA",
  plant: "All Plants",
  project: "All Projects",
  family: "All Families",
  suppliers: [],
  snapshot: "Latest import",
};

/**
 * Met à jour les options de customers depuis l'API
 * À appeler après avoir récupéré les données de /api/explore/filters/
 */
export function updateCustomerOptions(customers: string[]) {
  if (customers && customers.length > 0) {
    EXPLORE_CUSTOMER_OPTIONS = [...customers];
    console.log('✅ [filterConfig] Customer options mises à jour:', EXPLORE_CUSTOMER_OPTIONS.length, 'customers');
  }
}

/**
 * Réinitialise les options de customers aux valeurs par défaut
 */
export function resetCustomerOptions() {
  EXPLORE_CUSTOMER_OPTIONS = [...DEFAULT_CUSTOMER_OPTIONS];
}