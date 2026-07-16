import { SUPPLIER_OPTIONS } from "../components/shell/filterConfig";

export interface SupplierKpi {
  key: "marketShare" | "singleSource" | "released" | "savings";
  label: string;
  value: string;
  progress: number;
  delta: string;
}

export interface SupplierChartDatum {
  name: string;
  value: number;
}

export interface SupplierStatusDatum {
  name: "Released" | "Tech only" | "Not released";
  value: number;
  count: number;
  color: string;
}

export interface SupplierHotspot {
  id: string;
  region: "EMEA" | "AMERICAS" | "CHINA";
  family: string;
  customer: string;
  topShare: number;
}

export interface SupplierResultRow {
  msNumber: string;
  supplierPNs: string[];
  altPNs: string[];
  topSupplierName: string;
  alternatives: number;
  bestStatus: "Released" | "Tech only" | "Not released";
  topSupplierShare: number;
  selectedSupplierShare: number;
  totalVolume: number;
  savingsPotential: number;
  family: string;
  customer: string;
}

export interface SupplierDetailData {
  kpis: SupplierKpi[];
  shareByRegion: SupplierChartDatum[];
  shareByCustomer: SupplierChartDatum[];
  statusCoverage: SupplierStatusDatum[];
  statusTotalParts: number;
  hotspots: SupplierHotspot[];
  hotspotsGlobal: SupplierHotspot[];
  results: SupplierResultRow[];
}

interface RegionSupplierMap {
  bySupplier: Record<string, SupplierDetailData>;
}

function createSupplierData(supplier: string, region: "EMEA" | "AMERICAS" | "CHINA", seed: number): SupplierDetailData {
  const baseShare = 14 + (seed % 9);
  const highBias = (seed * 3) % 12;
  const statusTotalParts = 1800 + seed * 35;
  const released = 72 - (seed % 7);
  const techOnly = 18 + (seed % 5);
  const notReleased = Math.max(5, 100 - released - techOnly);
  const releasedCount = Math.round((released / 100) * statusTotalParts);
  const techCount = Math.round((techOnly / 100) * statusTotalParts);
  const notReleasedCount = Math.max(0, statusTotalParts - releasedCount - techCount);
  const hotspotsGlobal: SupplierHotspot[] = [
    { id: `${supplier}-g-emea`, region: "EMEA", family: "Harness", customer: "LEONI", topShare: 97 - (seed % 2) },
    { id: `${supplier}-g-americas`, region: "AMERICAS", family: "Connectors", customer: "LEONI", topShare: 91 + (seed % 3) },
    { id: `${supplier}-g-china`, region: "CHINA", family: "Modules", customer: "All Customers", topShare: 82 + (seed % 6) },
  ];
  const pnPrefix = supplier.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const topSupplierPool = [supplier, "TE", "APTIV", "MOLEX", "YAZAKI", "KOSTAL", "LEAR", "BOSCH", "JST", "KET", "Others"];
  const makeSupplierPNs = (index: number) => [`${pnPrefix}-${region.slice(0, 2)}-${seed}${index}A`, `${pnPrefix}-${region.slice(0, 2)}-${seed}${index}B`];
  const makeAltPNs = (index: number) => [
    `ALT-${region.slice(0, 2)}-${seed}${index}1`,
    `ALT-${region.slice(0, 2)}-${seed}${index}2`,
    `ALT-${region.slice(0, 2)}-${seed}${index}3`,
  ];
  const getTopSupplier = (index: number) => topSupplierPool[index % topSupplierPool.length];

  return {
    kpis: [
      {
        key: "marketShare",
        label: "Market share in scope",
        value: `${(baseShare + 8).toFixed(1)}%`,
        progress: Math.min(95, baseShare + 8),
        delta: `+${(1.1 + (seed % 4) * 0.3).toFixed(1)} pts`,
      },
      {
        key: "singleSource",
        label: "Single-source critical",
        value: `${118 + seed * 4}`,
        progress: 60 + (seed % 6) * 4,
        delta: `+${2 + (seed % 5)} items`,
      },
      {
        key: "released",
        label: "Released coverage",
        value: `${(68 + (seed % 8) * 2.1).toFixed(1)}%`,
        progress: 68 + (seed % 8) * 2,
        delta: `+${(0.8 + (seed % 3) * 0.4).toFixed(1)} pts`,
      },
      {
        key: "savings",
        label: "Savings potential",
        value: `€${(240 + seed * 45).toLocaleString("en-US")}k`,
        progress: 52 + (seed % 7) * 6,
        delta: `+€${(18 + seed * 4).toLocaleString("en-US")}k`,
      },
    ],
    shareByRegion: [
      { name: "EMEA", value: region === "EMEA" ? 44 + seed : 24 + seed },
      { name: "AMERICAS", value: region === "AMERICAS" ? 40 + seed : 22 + seed },
      { name: "CHINA", value: region === "CHINA" ? 42 + seed : 20 + seed },
    ],
    shareByCustomer: [
      { name: "LEONI", value: 32 + seed },
      { name: "VW", value: 16 + (seed % 5) },
      { name: "BMW", value: 13 + (seed % 4) },
      { name: "Stellantis", value: 12 + (seed % 3) },
      { name: "Renault", value: 9 + (seed % 3) },
      { name: "Others", value: 18 + (seed % 5) },
    ],
    statusCoverage: [
      { name: "Released", value: released, count: releasedCount, color: "#1562e0" },
      { name: "Tech only", value: techOnly, count: techCount, color: "#64a7ff" },
      { name: "Not released", value: notReleased, count: notReleasedCount, color: "#c8ddff" },
    ],
    statusTotalParts,
    hotspots: [
      ...hotspotsGlobal,
      { id: `${supplier}-hs-emea`, region: "EMEA", family: "Connectors", customer: "LEONI", topShare: 74 + highBias },
      { id: `${supplier}-hs-americas`, region: "AMERICAS", family: "Harness", customer: "All Customers", topShare: 66 + (seed % 8) },
    ],
    hotspotsGlobal,
    results: [
      { msNumber: `${region.slice(0, 2)}-${seed}001`, supplierPNs: makeSupplierPNs(1), altPNs: [...makeAltPNs(1), `ALT-${region.slice(0, 2)}-${seed}14`], topSupplierName: getTopSupplier(1), alternatives: 4, bestStatus: "Released", topSupplierShare: 97, selectedSupplierShare: 74, totalVolume: 620000, savingsPotential: 460000, family: "Harness", customer: "LEONI" },
      { msNumber: `${region.slice(0, 2)}-${seed}002`, supplierPNs: makeSupplierPNs(2), altPNs: makeAltPNs(2), topSupplierName: getTopSupplier(2), alternatives: 3, bestStatus: "Tech only", topSupplierShare: 95, selectedSupplierShare: 69, totalVolume: 540000, savingsPotential: 320000, family: "Connectors", customer: "LEONI" },
      { msNumber: `${region.slice(0, 2)}-${seed}003`, supplierPNs: [...makeSupplierPNs(3), `${pnPrefix}-${region.slice(0, 2)}-${seed}3C`], altPNs: [...makeAltPNs(3), `ALT-${region.slice(0, 2)}-${seed}34`, `ALT-${region.slice(0, 2)}-${seed}35`], topSupplierName: getTopSupplier(3), alternatives: 2, bestStatus: "Not released", topSupplierShare: 92, selectedSupplierShare: 61, totalVolume: 480000, savingsPotential: 210000, family: "Modules", customer: "All Customers" },
      { msNumber: `${region.slice(0, 2)}-${seed}004`, supplierPNs: makeSupplierPNs(4), altPNs: makeAltPNs(4), topSupplierName: getTopSupplier(4), alternatives: 5, bestStatus: "Released", topSupplierShare: 90, selectedSupplierShare: 58, totalVolume: 430000, savingsPotential: 155000, family: "Harness", customer: "LEONI" },
      { msNumber: `${region.slice(0, 2)}-${seed}005`, supplierPNs: makeSupplierPNs(5), altPNs: [...makeAltPNs(5), `ALT-${region.slice(0, 2)}-${seed}54`], topSupplierName: getTopSupplier(5), alternatives: 3, bestStatus: "Tech only", topSupplierShare: 86, selectedSupplierShare: 53, totalVolume: 390000, savingsPotential: 410000, family: "Connectors", customer: "All Customers" },
      { msNumber: `${region.slice(0, 2)}-${seed}006`, supplierPNs: makeSupplierPNs(6), altPNs: makeAltPNs(6), topSupplierName: getTopSupplier(6), alternatives: 2, bestStatus: "Not released", topSupplierShare: 82, selectedSupplierShare: 49, totalVolume: 340000, savingsPotential: 370000, family: "Modules", customer: "LEONI" },
      { msNumber: `${region.slice(0, 2)}-${seed}007`, supplierPNs: makeSupplierPNs(7), altPNs: [...makeAltPNs(7), `ALT-${region.slice(0, 2)}-${seed}74`, `ALT-${region.slice(0, 2)}-${seed}75`, `ALT-${region.slice(0, 2)}-${seed}76`], topSupplierName: getTopSupplier(7), alternatives: 4, bestStatus: "Released", topSupplierShare: 74, selectedSupplierShare: 42, totalVolume: 290000, savingsPotential: 145000, family: "Harness", customer: "LEONI" },
      { msNumber: `${region.slice(0, 2)}-${seed}008`, supplierPNs: makeSupplierPNs(8), altPNs: makeAltPNs(8), topSupplierName: getTopSupplier(8), alternatives: 3, bestStatus: "Tech only", topSupplierShare: 68, selectedSupplierShare: 39, totalVolume: 250000, savingsPotential: 98000, family: "Connectors", customer: "All Customers" },
      { msNumber: `${region.slice(0, 2)}-${seed}009`, supplierPNs: makeSupplierPNs(9), altPNs: [...makeAltPNs(9), `ALT-${region.slice(0, 2)}-${seed}94`], topSupplierName: getTopSupplier(9), alternatives: 2, bestStatus: "Not released", topSupplierShare: 62, selectedSupplierShare: 33, totalVolume: 220000, savingsPotential: 78000, family: "Modules", customer: "LEONI" },
      { msNumber: `${region.slice(0, 2)}-${seed}010`, supplierPNs: [...makeSupplierPNs(10), `${pnPrefix}-${region.slice(0, 2)}-${seed}10C`], altPNs: [...makeAltPNs(10), `ALT-${region.slice(0, 2)}-${seed}104`, `ALT-${region.slice(0, 2)}-${seed}105`], topSupplierName: getTopSupplier(10), alternatives: 5, bestStatus: "Released", topSupplierShare: 55, selectedSupplierShare: 27, totalVolume: 180000, savingsPotential: 36000, family: "Harness", customer: "All Customers" },
    ],
  };
}

function buildRegion(region: "EMEA" | "AMERICAS" | "CHINA", seedBase: number): RegionSupplierMap {
  const bySupplier: Record<string, SupplierDetailData> = {};
  SUPPLIER_OPTIONS.forEach((supplier, index) => {
    bySupplier[supplier] = createSupplierData(supplier, region, seedBase + index);
  });
  return { bySupplier };
}

export const supplierDetailByRegion: Record<"EMEA" | "AMERICAS" | "CHINA", RegionSupplierMap> = {
  EMEA: buildRegion("EMEA", 4),
  AMERICAS: buildRegion("AMERICAS", 10),
  CHINA: buildRegion("CHINA", 16),
};

export function getSupplierDetailData(region: "EMEA" | "AMERICAS" | "CHINA", supplier: string) {
  return supplierDetailByRegion[region].bySupplier[supplier] ?? supplierDetailByRegion[region].bySupplier.TE;
}
