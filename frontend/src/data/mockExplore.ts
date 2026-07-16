import { EXPLORE_CUSTOMER_OPTIONS } from "../components/shell/filterConfig";
import type { BreakdownOption, ExploreChartDatum, MatrixStatus, MsGroupRow, PartRow, StatusMatrixRow, SupplierKey } from "../types/explore";

const SUPPLIERS: SupplierKey[] = ["TE", "APTIV", "MOLEX", "YAZAKI", "KOSTAL", "LEAR", "BOSCH", "JST", "KET", "Others"];

function createCells(seed: Partial<Record<SupplierKey, { materialGroup: string; status: MatrixStatus }>>) {
  return SUPPLIERS.reduce((acc, supplier) => {
    acc[supplier] = seed[supplier] ?? null;
    return acc;
  }, {} as Record<SupplierKey, { materialGroup: string; status: MatrixStatus } | null>);
}

const breakdownOptions: BreakdownOption[] = ["Global", "Customer", "Region", "Component classification", "TAB width"];

const classificationOptions = [
  { label: "Terminal", value: "Terminal", enabled: true },
  { label: "Connector", value: "Connector", enabled: false },
  { label: "Seal", value: "Seal", enabled: false },
  { label: "Housing", value: "Housing", enabled: false },
] as const;

const tabWidthOptions = ["All", "0.5", "0.64", "1.2", "1.5", "2.8", "6.3"];

const marketShare = {
  global: [
    { name: "TE", value: 31 },
    { name: "APTIV", value: 20 },
    { name: "MOLEX", value: 15 },
    { name: "YAZAKI", value: 11 },
    { name: "KOSTAL", value: 9 },
    { name: "Others", value: 14 },
  ],
  byCustomer: {
    Stellantis: [
      { name: "TE", value: 30 },
      { name: "APTIV", value: 24 },
      { name: "MOLEX", value: 14 },
      { name: "YAZAKI", value: 9 },
      { name: "KOSTAL", value: 9 },
      { name: "Others", value: 14 },
    ],
    VW: [
      { name: "TE", value: 26 },
      { name: "APTIV", value: 18 },
      { name: "MOLEX", value: 21 },
      { name: "YAZAKI", value: 10 },
      { name: "KOSTAL", value: 11 },
      { name: "Others", value: 14 },
    ],
    BMW: [
      { name: "TE", value: 24 },
      { name: "APTIV", value: 19 },
      { name: "MOLEX", value: 17 },
      { name: "YAZAKI", value: 14 },
      { name: "KOSTAL", value: 12 },
      { name: "Others", value: 14 },
    ],
    "Mercedes-Benz": [
      { name: "TE", value: 23 },
      { name: "APTIV", value: 17 },
      { name: "MOLEX", value: 18 },
      { name: "YAZAKI", value: 16 },
      { name: "KOSTAL", value: 11 },
      { name: "Others", value: 15 },
    ],
    JLR: [
      { name: "TE", value: 27 },
      { name: "APTIV", value: 16 },
      { name: "MOLEX", value: 15 },
      { name: "YAZAKI", value: 12 },
      { name: "KOSTAL", value: 10 },
      { name: "Others", value: 20 },
    ],
    Porsche: [
      { name: "TE", value: 22 },
      { name: "APTIV", value: 18 },
      { name: "MOLEX", value: 19 },
      { name: "YAZAKI", value: 11 },
      { name: "KOSTAL", value: 13 },
      { name: "Others", value: 17 },
    ],
    Tesla: [
      { name: "TE", value: 19 },
      { name: "APTIV", value: 21 },
      { name: "MOLEX", value: 16 },
      { name: "YAZAKI", value: 18 },
      { name: "KOSTAL", value: 8 },
      { name: "Others", value: 18 },
    ],
  },
  byRegion: {
    EMEA: [
      { name: "TE", value: 31 },
      { name: "APTIV", value: 20 },
      { name: "MOLEX", value: 15 },
      { name: "YAZAKI", value: 11 },
      { name: "KOSTAL", value: 9 },
      { name: "Others", value: 14 },
    ],
    AMERICAS: [
      { name: "APTIV", value: 28 },
      { name: "TE", value: 24 },
      { name: "MOLEX", value: 16 },
      { name: "KOSTAL", value: 10 },
      { name: "YAZAKI", value: 8 },
      { name: "Others", value: 14 },
    ],
    CHINA: [
      { name: "YAZAKI", value: 25 },
      { name: "TE", value: 22 },
      { name: "APTIV", value: 18 },
      { name: "MOLEX", value: 14 },
      { name: "KOSTAL", value: 8 },
      { name: "Others", value: 13 },
    ],
  },
  byClassification: {
    Terminal: [
      { name: "TE", value: 32 },
      { name: "APTIV", value: 20 },
      { name: "MOLEX", value: 15 },
      { name: "YAZAKI", value: 10 },
      { name: "KOSTAL", value: 9 },
      { name: "Others", value: 14 },
    ],
  },
  byTabWidth: {
    All: [
      { name: "TE", value: 31 },
      { name: "APTIV", value: 20 },
      { name: "MOLEX", value: 15 },
      { name: "YAZAKI", value: 11 },
      { name: "KOSTAL", value: 9 },
      { name: "Others", value: 14 },
    ],
    "0.5": [
      { name: "TE", value: 27 },
      { name: "APTIV", value: 24 },
      { name: "MOLEX", value: 16 },
      { name: "KOSTAL", value: 9 },
      { name: "Others", value: 24 },
    ],
    "0.64": [
      { name: "TE", value: 34 },
      { name: "APTIV", value: 19 },
      { name: "MOLEX", value: 15 },
      { name: "YAZAKI", value: 10 },
      { name: "Others", value: 22 },
    ],
    "1.2": [
      { name: "APTIV", value: 24 },
      { name: "TE", value: 22 },
      { name: "MOLEX", value: 18 },
      { name: "KOSTAL", value: 12 },
      { name: "Others", value: 24 },
    ],
    "1.5": [
      { name: "TE", value: 26 },
      { name: "MOLEX", value: 19 },
      { name: "APTIV", value: 18 },
      { name: "YAZAKI", value: 12 },
      { name: "Others", value: 25 },
    ],
    "2.8": [
      { name: "BOSCH", value: 23 },
      { name: "TE", value: 22 },
      { name: "YAZAKI", value: 18 },
      { name: "MOLEX", value: 13 },
      { name: "Others", value: 24 },
    ],
    "6.3": [
      { name: "TE", value: 25 },
      { name: "KOSTAL", value: 20 },
      { name: "MOLEX", value: 16 },
      { name: "JST", value: 11 },
      { name: "Others", value: 28 },
    ],
  },
};

const volumeByTabWidth: ExploreChartDatum[] = [
  { name: "0.5", value: 1.8 },
  { name: "0.64", value: 6.5 },
  { name: "1.2", value: 4.2 },
  { name: "1.5", value: 2.7 },
  { name: "2.8", value: 1.9 },
  { name: "6.3", value: 1.4 },
];

const volumeByRegion = {
  EMEA: [
    { name: "EMEA", value: 12.4 },
    { name: "AMERICAS", value: 8.1 },
    { name: "CHINA", value: 5.3 },
  ],
  AMERICAS: [
    { name: "AMERICAS", value: 10.9 },
    { name: "EMEA", value: 7.2 },
    { name: "CHINA", value: 4.6 },
  ],
  CHINA: [
    { name: "CHINA", value: 9.7 },
    { name: "EMEA", value: 6.1 },
    { name: "AMERICAS", value: 4.8 },
  ],
};

const statusMatrixRows: StatusMatrixRow[] = [
  {
    contactSystem: "MQS 0.64",
    tabWidth: "0.64",
    customers: ["Stellantis", "VW", "BMW", "Mercedes-Benz"],
    volume2026: 1240000,
    share: 13.9,
    cells: createCells({
      TE: { materialGroup: "MQS 0.64 LL", status: "released-compatible" },
      APTIV: { materialGroup: "OCS 064 LL", status: "released-interface" },
      MOLEX: { materialGroup: "MX 064 CL", status: "not-released-compatible" },
    }),
  },
  {
    contactSystem: "MCON 0.5",
    tabWidth: "0.5",
    customers: ["Stellantis", "VW", "JLR", "Porsche"],
    volume2026: 1080000,
    share: 12.1,
    cells: createCells({
      TE: { materialGroup: "MCON 0.5 LL", status: "released-compatible" },
      MOLEX: { materialGroup: "MX 050 LL", status: "released-interface" },
      BOSCH: { materialGroup: "BCS 050 LL", status: "not-released-interface" },
    }),
  },
  {
    contactSystem: "OCS 1.2",
    tabWidth: "1.2",
    customers: ["Stellantis", "BMW", "Mercedes-Benz", "Tesla"],
    volume2026: 970000,
    share: 10.8,
    cells: createCells({
      TE: { materialGroup: "MCON 1.2 LL", status: "released-compatible" },
      KOSTAL: { materialGroup: "KON 120 LL", status: "not-released-compatible" },
      JST: { materialGroup: "JCS 120 LL", status: "not-released-interface" },
    }),
  },
  {
    contactSystem: "HDS 1.5",
    tabWidth: "1.5",
    customers: ["VW", "BMW", "Mercedes-Benz", "Porsche"],
    volume2026: 820000,
    share: 9.2,
    cells: createCells({
      TE: { materialGroup: "HDS 1.5 LL", status: "released-compatible" },
      APTIV: { materialGroup: "OCS 150 LL", status: "not-released-compatible" },
      LEAR: { materialGroup: "LCS 150 LL", status: "released-interface" },
    }),
  },
  {
    contactSystem: "AK 2.8",
    tabWidth: "2.8",
    customers: ["Stellantis", "JLR", "Porsche", "Tesla"],
    volume2026: 710000,
    share: 7.9,
    cells: createCells({
      TE: { materialGroup: "AK 2.8 LL", status: "released-compatible" },
      YAZAKI: { materialGroup: "YCS 280 LL", status: "not-released-compatible" },
      KET: { materialGroup: "KET 280 LL", status: "not-released-interface" },
    }),
  },
  {
    contactSystem: "PWS 6.3",
    tabWidth: "6.3",
    customers: ["BMW", "Mercedes-Benz", "JLR", "Tesla"],
    volume2026: 560000,
    share: 6.3,
    cells: createCells({
      TE: { materialGroup: "PWS 6.3 LL", status: "released-compatible" },
      KOSTAL: { materialGroup: "KON 630 LL", status: "released-interface" },
      BOSCH: { materialGroup: "BCS 630 LL", status: "not-released-compatible" },
    }),
  },
];

const resultsMsGroups: MsGroupRow[] = [
  {
    msNumber: "MS000101",
    tabWidth: "0.64",
    customers: ["Stellantis", "VW", "BMW", "Mercedes-Benz"],
    alternativesCount: 2,
    bestAvailability: "Released alternative available",
    bestAvailabilityByCustomer: {
      Stellantis: "Released alternative available",
      VW: "Technical alternative only",
      BMW: "Released alternative available",
      "Mercedes-Benz": "Technical alternative only",
    },
    topSupplierShareByCustomer: {
      Stellantis: 46,
      VW: 62,
      BMW: 49,
      "Mercedes-Benz": 67,
    },
    totalVolume: 180000,
  },
  {
    msNumber: "MS000112",
    tabWidth: "0.5",
    customers: ["Stellantis", "VW", "JLR", "Porsche"],
    alternativesCount: 3,
    bestAvailability: "Technical alternative only",
    bestAvailabilityByCustomer: {
      Stellantis: "Technical alternative only",
      VW: "Released alternative available",
      JLR: "Technical alternative only",
      Porsche: "No alternative available",
    },
    topSupplierShareByCustomer: {
      Stellantis: 76,
      VW: 58,
      JLR: 73,
      Porsche: 98,
    },
    totalVolume: 240000,
  },
  {
    msNumber: "MS000123",
    tabWidth: "1.2",
    customers: ["Stellantis", "BMW", "Mercedes-Benz", "Tesla"],
    alternativesCount: 4,
    bestAvailability: "Released alternative available",
    bestAvailabilityByCustomer: {
      Stellantis: "Released alternative available",
      BMW: "Released alternative available",
      "Mercedes-Benz": "Technical alternative only",
      Tesla: "Technical alternative only",
    },
    topSupplierShareByCustomer: {
      Stellantis: 52,
      BMW: 48,
      "Mercedes-Benz": 84,
      Tesla: 79,
    },
    totalVolume: 640000,
  },
  {
    msNumber: "MS000141",
    tabWidth: "1.5",
    customers: ["VW", "BMW", "Mercedes-Benz", "Porsche"],
    alternativesCount: 3,
    bestAvailability: "Technical alternative only",
    bestAvailabilityByCustomer: {
      VW: "Technical alternative only",
      BMW: "Released alternative available",
      "Mercedes-Benz": "Technical alternative only",
      Porsche: "Technical alternative only",
    },
    topSupplierShareByCustomer: {
      VW: 82,
      BMW: 54,
      "Mercedes-Benz": 88,
      Porsche: 75,
    },
    totalVolume: 530000,
  },
  {
    msNumber: "MS000155",
    tabWidth: "2.8",
    customers: ["Stellantis", "JLR", "Porsche", "Tesla"],
    alternativesCount: 2,
    bestAvailability: "No alternative available",
    bestAvailabilityByCustomer: {
      Stellantis: "No alternative available",
      JLR: "Technical alternative only",
      Porsche: "No alternative available",
      Tesla: "Technical alternative only",
    },
    topSupplierShareByCustomer: {
      Stellantis: 97,
      JLR: 78,
      Porsche: 99,
      Tesla: 83,
    },
    totalVolume: 410000,
  },
  {
    msNumber: "MS000166",
    tabWidth: "6.3",
    customers: ["BMW", "Mercedes-Benz", "JLR", "Tesla"],
    alternativesCount: 4,
    bestAvailability: "Technical alternative only",
    bestAvailabilityByCustomer: {
      BMW: "Released alternative available",
      "Mercedes-Benz": "Technical alternative only",
      JLR: "Technical alternative only",
      Tesla: "No alternative available",
    },
    topSupplierShareByCustomer: {
      BMW: 57,
      "Mercedes-Benz": 72,
      JLR: 81,
      Tesla: 96,
    },
    totalVolume: 295000,
  },
];

const resultsParts: PartRow[] = [
  {
    partNumber: "PN-TE-88421",
    msNumber: "MS000123",
    tabWidth: "1.2",
    customers: ["Stellantis", "BMW", "Mercedes-Benz", "Tesla"],
    supplier: "TE",
    materialGroup: "MCON 1.2 LL",
    status: "Released / Compatible",
    statusByCustomer: {
      Stellantis: "Released / Compatible",
      BMW: "Released / Compatible",
      "Mercedes-Benz": "Released / Comp. interface",
      Tesla: "Not released / Compatible",
    },
    volume: 220000,
  },
  {
    partNumber: "PN-MX-11002",
    msNumber: "MS000141",
    tabWidth: "1.5",
    customers: ["VW", "BMW", "Mercedes-Benz", "Porsche"],
    supplier: "MOLEX",
    materialGroup: "HDS 1.5 LL",
    status: "Released / Comp. interface",
    statusByCustomer: {
      VW: "Released / Comp. interface",
      BMW: "Released / Compatible",
      "Mercedes-Benz": "Not released / Compatible",
      Porsche: "Released / Comp. interface",
    },
    volume: 185000,
  },
  {
    partNumber: "PN-YZ-77891",
    msNumber: "MS000155",
    tabWidth: "2.8",
    customers: ["Stellantis", "JLR", "Porsche", "Tesla"],
    supplier: "YAZAKI",
    materialGroup: "AK 2.8 LL",
    status: "Not released / Compatible",
    statusByCustomer: {
      Stellantis: "Not released / Compatible",
      JLR: "Released / Comp. interface",
      Porsche: "Not released / Compatible",
      Tesla: "Released / Compatible",
    },
    volume: 160000,
  },
  {
    partNumber: "PN-KS-44018",
    msNumber: "MS000166",
    tabWidth: "6.3",
    customers: ["BMW", "Mercedes-Benz", "JLR", "Tesla"],
    supplier: "KOSTAL",
    materialGroup: "PWS 6.3 LL",
    status: "Not released / Comp. interface",
    statusByCustomer: {
      BMW: "Released / Comp. interface",
      "Mercedes-Benz": "Not released / Comp. interface",
      JLR: "Not released / Compatible",
      Tesla: "Not released / Comp. interface",
    },
    volume: 132000,
  },
  {
    partNumber: "PN-AP-99270",
    msNumber: "MS000101",
    tabWidth: "0.64",
    customers: ["Stellantis", "VW", "BMW", "Mercedes-Benz"],
    supplier: "APTIV",
    materialGroup: "OCS 064 LL",
    status: "Released / Comp. interface",
    statusByCustomer: {
      Stellantis: "Released / Comp. interface",
      VW: "Not released / Compatible",
      BMW: "Released / Comp. interface",
      "Mercedes-Benz": "Not released / Comp. interface",
    },
    volume: 108000,
  },
  {
    partNumber: "PN-BS-22091",
    msNumber: "MS000112",
    tabWidth: "0.5",
    customers: ["Stellantis", "VW", "JLR", "Porsche"],
    supplier: "BOSCH",
    materialGroup: "BCS 050 LL",
    status: "Not released / Comp. interface",
    statusByCustomer: {
      Stellantis: "Not released / Comp. interface",
      VW: "Released / Comp. interface",
      JLR: "Not released / Compatible",
      Porsche: "Not released / Comp. interface",
    },
    volume: 94000,
  },
];

const coverageKpis = [
  { key: "tech", label: "Technical alternative coverage", value: "85.21%", progress: 85, delta: "+1.9 pts" },
  { key: "released", label: "Released alternative coverage", value: "80.17%", progress: 80, delta: "+1.1 pts" },
  { key: "critical", label: "Single-source critical", value: "142", progress: 67, delta: "+6 items" },
] as const;

const emeaExplore = {
  breakdownOptions,
  classificationOptions: [...classificationOptions],
  tabWidthOptions,
  coverageKpis: [...coverageKpis],
  marketShare,
  volumeByTabWidth,
  volumeByRegion: volumeByRegion.EMEA,
  statusMatrixRows,
  resultsMsGroups,
  resultsParts,
};

function scaleData(data: ExploreChartDatum[], factor: number) {
  return data.map((item) => ({ ...item, value: Number((item.value * factor).toFixed(1)) }));
}

function patchRegion(region: "EMEA" | "AMERICAS" | "CHINA") {
  if (region === "EMEA") return emeaExplore;

  const factor = region === "AMERICAS" ? 0.88 : 0.79;
  return {
    ...emeaExplore,
    coverageKpis: emeaExplore.coverageKpis.map((item, index) => {
      const progress = Math.max(58, Math.min(92, item.progress - (region === "CHINA" ? 6 : -2) + index));
      return { ...item, progress };
    }),
    marketShare: {
      ...emeaExplore.marketShare,
      byRegion: emeaExplore.marketShare.byRegion,
    },
    volumeByTabWidth: scaleData(emeaExplore.volumeByTabWidth, factor),
    volumeByRegion: volumeByRegion[region],
    statusMatrixRows: emeaExplore.statusMatrixRows.map((row) => ({
      ...row,
      volume2026: Math.round(row.volume2026 * factor),
      share: Number((row.share * factor).toFixed(1)),
    })),
    resultsMsGroups: emeaExplore.resultsMsGroups.map((row, index) => ({
      ...row,
      msNumber: `${region.slice(0, 2)}${row.msNumber.slice(2)}`,
      totalVolume: Math.round(row.totalVolume * factor) + index * 4000,
    })),
    resultsParts: emeaExplore.resultsParts.map((row, index) => ({
      ...row,
      partNumber: `${region.slice(0, 2)}-${row.partNumber}`,
      volume: Math.round(row.volume * factor) + index * 1500,
    })),
  };
}

export const exploreByRegion = {
  EMEA: emeaExplore,
  AMERICAS: patchRegion("AMERICAS"),
  CHINA: patchRegion("CHINA"),
};

export const mockExploreData = exploreByRegion.EMEA;
export const exploreCustomerOptions = [...EXPLORE_CUSTOMER_OPTIONS];
