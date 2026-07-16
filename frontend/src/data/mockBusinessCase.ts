import type {
  CompatibilityAttribute,
  ComponentOemRelease,
  OemReleaseStatus,
} from "./mockComponentDetail";

export type PurchaseRegion = "CHINA" | "EMEA" | "AMERICAS";
export type UsageMarket = "ASIA" | "EMEA" | "AMERICAS" | "GLOBAL";

export type VolumeEntry = {
  name: string;
  volume: number;
};

export type BusinessCaseRow = {
  reference: string;
  currentSupplier: string;
  currentPn: string;
  targetSupplier: string;
  targetPn: string;
  compatibilityAttribute: CompatibilityAttribute;
  oemReleaseMatrix: ComponentOemRelease[];
  currentPrice: number;
  targetPrice: number;
  totalAnnualVolume: number;
  baselineVolumeByCustomer: VolumeEntry[];
  baselineVolumeByRegion: VolumeEntry[];
  notes: string;
  topSupplierShare: number;
};

export type BusinessCaseScenario = {
  msNumber: string;
  currentSupplier: string;
  currentPn: string;
  targetSupplier: string;
  targetPn: string;
  defaultPurchaseRegion: PurchaseRegion;
  defaultUsageMarket: UsageMarket;
  baselineVolumeByCustomer: VolumeEntry[];
  baselineVolumeByRegion: VolumeEntry[];
  marketShareBeforeAfter: {
    before: { current: number; target: number; others: number };
    after: { current: number; target: number; others: number };
  };
  tableRows: BusinessCaseRow[];
};

export type ComputedBusinessCaseRow = BusinessCaseRow & {
  deltaPrice: number;
  annualSaving: number;
};

const PN_SUPPLIER_PREFIX: Record<string, string> = {
  TE: "TE",
  APT: "APTIV",
  MOL: "MOLEX",
  YAZ: "YAZAKI",
  KOS: "KOSTAL",
  BOS: "BOSCH",
};

function splitByShares(total: number, shares: Array<{ name: string; share: number }>): VolumeEntry[] {
  const raw = shares.map((item) => ({ name: item.name, volume: Math.round(total * item.share) }));
  const sum = raw.reduce((acc, item) => acc + item.volume, 0);
  const diff = total - sum;
  if (raw.length > 0 && diff !== 0) {
    raw[0] = { ...raw[0], volume: raw[0].volume + diff };
  }
  return raw;
}

const CUSTOMER_SHARES = [
  { name: "BMW", share: 0.24 },
  { name: "VW", share: 0.2 },
  { name: "Mercedes-Benz", share: 0.19 },
  { name: "Stellantis", share: 0.17 },
  { name: "Tesla", share: 0.12 },
  { name: "JLR", share: 0.08 },
] as const;

const REGION_SHARES = [
  { name: "EMEA", share: 0.47 },
  { name: "AMERICAS", share: 0.29 },
  { name: "ASIA", share: 0.24 },
] as const;

function buildOemReleaseMatrix(index: number): ComponentOemRelease[] {
  const releasePatterns: OemReleaseStatus[][] = [
    ["Released", "Released", "Released", "Released"],
    ["Released", "Released", "Released", "Not released"],
    ["Released", "Released", "Not released", "Released"],
    ["Released", "Not released", "Released", "Released"],
    ["Released", "Released", "Not released", "Not released"],
    ["Released", "Not released", "Not released", "Released"],
  ];
  const pattern = releasePatterns[index % releasePatterns.length];
  return [
    { oem: "BMW", status: pattern[0] },
    { oem: "VW", status: pattern[1] },
    { oem: "Mercedes-Benz", status: pattern[2] },
    { oem: "Tesla", status: pattern[3] },
  ];
}

function makeRows(currentSupplier: string, currentPn: string, targetSupplier: string, targetPn: string): BusinessCaseRow[] {
  const refs = [
    "REF-AXB-001",
    "REF-AXB-002",
    "REF-AXB-003",
    "REF-AXB-004",
    "REF-AXB-005",
    "REF-AXB-006",
    "REF-AXB-007",
    "REF-AXB-008",
    "REF-AXB-009",
    "REF-AXB-010",
    "REF-AXB-011",
    "REF-AXB-012",
  ];
  const compatibilityAttributes: CompatibilityAttribute[] = [
    "Compatible",
    "Compatible interface",
    "Compatible",
    "Compatible interface",
  ];

  return refs.map((reference, index) => {
    const baseVolume = 48000 + index * 6200;
    const currentPrice = 0.57 + (index % 4) * 0.03;
    const targetPrice = currentPrice - (0.04 + (index % 3) * 0.01);

    return {
      reference,
      currentSupplier,
      currentPn: `${currentPn}-${String(index + 1).padStart(2, "0")}`,
      targetSupplier,
      targetPn: `${targetPn}-${String(index + 1).padStart(2, "0")}`,
      compatibilityAttribute: compatibilityAttributes[index % compatibilityAttributes.length],
      oemReleaseMatrix: buildOemReleaseMatrix(index),
      currentPrice: Number(currentPrice.toFixed(3)),
      targetPrice: Number(targetPrice.toFixed(3)),
      totalAnnualVolume: baseVolume,
      baselineVolumeByCustomer: splitByShares(baseVolume, [...CUSTOMER_SHARES]),
      baselineVolumeByRegion: splitByShares(baseVolume, [...REGION_SHARES]),
      notes:
        index % 4 === 0
          ? "Customer release pending (BMW)."
          : index % 4 === 1
            ? "Tooling switch-over cost to validate."
            : index % 4 === 2
              ? "Customer release evidence to consolidate."
              : "Current supplier retention risk in Q3.",
      topSupplierShare: 82 + (index % 5) * 4,
    };
  });
}

export const mockBusinessCaseByMs: Record<string, BusinessCaseScenario> = {
  MS000112: {
    msNumber: "MS000112",
    currentSupplier: "TE",
    currentPn: "TE-0.64-MS112-A1",
    targetSupplier: "APTIV",
    targetPn: "APT-0.64-MS112-B2",
    defaultPurchaseRegion: "EMEA",
    defaultUsageMarket: "EMEA",
    baselineVolumeByCustomer: splitByShares(910000, [...CUSTOMER_SHARES]),
    baselineVolumeByRegion: splitByShares(910000, [...REGION_SHARES]),
    marketShareBeforeAfter: {
      before: { current: 68, target: 12, others: 20 },
      after: { current: 38, target: 44, others: 18 },
    },
    tableRows: makeRows("TE", "TE-0.64-MS112-A1", "APTIV", "APT-0.64-MS112-B2"),
  },
  MS000101: {
    msNumber: "MS000101",
    currentSupplier: "TE",
    currentPn: "TE-0.64-AX12",
    targetSupplier: "MOLEX",
    targetPn: "MOL-0.64-HQ14",
    defaultPurchaseRegion: "AMERICAS",
    defaultUsageMarket: "AMERICAS",
    baselineVolumeByCustomer: splitByShares(760000, [...CUSTOMER_SHARES]),
    baselineVolumeByRegion: splitByShares(760000, [...REGION_SHARES]),
    marketShareBeforeAfter: {
      before: { current: 61, target: 15, others: 24 },
      after: { current: 34, target: 46, others: 20 },
    },
    tableRows: makeRows("TE", "TE-0.64-AX12", "MOLEX", "MOL-0.64-HQ14"),
  },
  MS000202: {
    msNumber: "MS000202",
    currentSupplier: "KOSTAL",
    currentPn: "KOS-1.20-MN66",
    targetSupplier: "TE",
    targetPn: "TE-1.20-FX22",
    defaultPurchaseRegion: "CHINA",
    defaultUsageMarket: "ASIA",
    baselineVolumeByCustomer: splitByShares(830000, [...CUSTOMER_SHARES]),
    baselineVolumeByRegion: splitByShares(830000, [...REGION_SHARES]),
    marketShareBeforeAfter: {
      before: { current: 72, target: 10, others: 18 },
      after: { current: 41, target: 43, others: 16 },
    },
    tableRows: makeRows("KOSTAL", "KOS-1.20-MN66", "TE", "TE-1.20-FX22"),
  },
};

export function listBusinessCaseMs() {
  return Object.keys(mockBusinessCaseByMs);
}

export function getBusinessCaseScenario(msNumber: string) {
  return mockBusinessCaseByMs[msNumber];
}

export function deriveSupplierFromPn(partNumber: string) {
  const prefix = partNumber.split("-")[0]?.toUpperCase();
  return PN_SUPPLIER_PREFIX[prefix] ?? prefix ?? "Unknown";
}

export function computeRows(rows: BusinessCaseRow[]): ComputedBusinessCaseRow[] {
  return rows.map((row) => {
    const deltaPrice = row.currentPrice - row.targetPrice;
    const annualSaving = deltaPrice * row.totalAnnualVolume;

    return {
      ...row,
      deltaPrice,
      annualSaving,
    };
  });
}
