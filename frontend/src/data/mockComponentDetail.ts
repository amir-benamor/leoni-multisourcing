export type CompatibilityAttribute = "Compatible" | "Compatible interface";
export type OemReleaseStatus = "Released" | "Not released";
export type CommercialRegion = "EMEA" | "AMERICAS" | "CHINA";
export type Status4 =
  | "Released_Compatible"
  | "Released_Interface"
  | "NotReleased_Compatible"
  | "NotReleased_Interface";

export type RegionalPrice = {
  region: CommercialRegion;
  unitPrice: number;
};

export type ComponentOemRelease = {
  oem: string;
  status: OemReleaseStatus;
};

export type ComponentPart = {
  partNumber: string;
  supplier: string;
  compatibilityAttribute: CompatibilityAttribute;
  oemReleaseStatuses: ComponentOemRelease[];
  regionalPrices: RegionalPrice[];
  currency: "EUR";
  contactSystem?: string;
  annualVolume: number;
};

export type ComponentGroup = {
  msNumber: string;
  defaultPN: string;
  parts: ComponentPart[];
  volumeShare: Array<{ name: string; value: number }>;
  volumeUnits: Array<{ name: string; value: number }>;
};

export type ComponentSuggestion = {
  type: "PN" | "MS";
  value: string;
};

export type TopCard = {
  kind: "volume" | "risk" | "saving";
  msNumber: string;
  reason: string;
};

export const msGroups: ComponentGroup[] = [
  {
    msNumber: "MS000112",
    defaultPN: "TE-0.64-MS112-A1",
    parts: [
      {
        partNumber: "TE-0.64-MS112-A1",
        supplier: "TE",
        compatibilityAttribute: "Compatible",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Released" },
          { oem: "Tesla", status: "Not released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.48 },
          { region: "AMERICAS", unitPrice: 0.5 },
          { region: "CHINA", unitPrice: 0.46 },
        ],
        currency: "EUR",
        contactSystem: "MQS 0.64",
        annualVolume: 460000,
      },
      {
        partNumber: "APT-0.64-MS112-B2",
        supplier: "APTIV",
        compatibilityAttribute: "Compatible interface",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Not released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.45 },
          { region: "AMERICAS", unitPrice: 0.47 },
          { region: "CHINA", unitPrice: 0.43 },
        ],
        currency: "EUR",
        contactSystem: "MQS 0.64",
        annualVolume: 460000,
      },
      {
        partNumber: "MOL-0.64-MS112-C3",
        supplier: "MOLEX",
        compatibilityAttribute: "Compatible",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Not released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Not released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.41 },
          { region: "AMERICAS", unitPrice: 0.43 },
          { region: "CHINA", unitPrice: 0.39 },
        ],
        currency: "EUR",
        contactSystem: "MQS 0.64",
        annualVolume: 460000,
      },
      {
        partNumber: "YAZ-0.64-MS112-D4",
        supplier: "YAZAKI",
        compatibilityAttribute: "Compatible interface",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Not released" },
          { oem: "VW", status: "Not released" },
          { oem: "Mercedes-Benz", status: "Released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.4 },
          { region: "AMERICAS", unitPrice: 0.42 },
          { region: "CHINA", unitPrice: 0.38 },
        ],
        currency: "EUR",
        contactSystem: "MQS 0.64",
        annualVolume: 460000,
      },
      {
        partNumber: "KOS-0.64-MS112-E5",
        supplier: "KOSTAL",
        compatibilityAttribute: "Compatible",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Not released" },
          { oem: "Tesla", status: "Not released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.44 },
          { region: "AMERICAS", unitPrice: 0.45 },
          { region: "CHINA", unitPrice: 0.42 },
        ],
        currency: "EUR",
        contactSystem: "MQS 0.64",
        annualVolume: 460000,
      },
    ],
    volumeShare: [
      { name: "TE", value: 35 },
      { name: "APTIV", value: 24 },
      { name: "MOLEX", value: 18 },
      { name: "YAZAKI", value: 13 },
      { name: "KOSTAL", value: 10 },
    ],
    volumeUnits: [
      { name: "EMEA", value: 210000 },
      { name: "AMERICAS", value: 135000 },
      { name: "CHINA", value: 115000 },
    ],
  },
  {
    msNumber: "MS000101",
    defaultPN: "TE-0.64-AX12",
    parts: [
      {
        partNumber: "TE-0.64-AX12",
        supplier: "TE",
        compatibilityAttribute: "Compatible",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.42 },
          { region: "AMERICAS", unitPrice: 0.44 },
          { region: "CHINA", unitPrice: 0.4 },
        ],
        currency: "EUR",
        contactSystem: "MQS 0.64",
        annualVolume: 530000,
      },
      {
        partNumber: "APT-0.64-RT33",
        supplier: "APTIV",
        compatibilityAttribute: "Compatible interface",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Not released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.39 },
          { region: "AMERICAS", unitPrice: 0.4 },
          { region: "CHINA", unitPrice: 0.37 },
        ],
        currency: "EUR",
        contactSystem: "MQS 0.64",
        annualVolume: 530000,
      },
      {
        partNumber: "MOL-0.64-HQ14",
        supplier: "MOLEX",
        compatibilityAttribute: "Compatible",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Not released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Not released" },
          { oem: "Tesla", status: "Not released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.36 },
          { region: "AMERICAS", unitPrice: 0.38 },
          { region: "CHINA", unitPrice: 0.35 },
        ],
        currency: "EUR",
        contactSystem: "MQS 0.64",
        annualVolume: 530000,
      },
      {
        partNumber: "YAZ-0.64-KP90",
        supplier: "YAZAKI",
        compatibilityAttribute: "Compatible interface",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Not released" },
          { oem: "VW", status: "Not released" },
          { oem: "Mercedes-Benz", status: "Released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.34 },
          { region: "AMERICAS", unitPrice: 0.35 },
          { region: "CHINA", unitPrice: 0.33 },
        ],
        currency: "EUR",
        contactSystem: "MQS 0.64",
        annualVolume: 530000,
      },
    ],
    volumeShare: [
      { name: "TE", value: 46 },
      { name: "APTIV", value: 22 },
      { name: "MOLEX", value: 19 },
      { name: "YAZAKI", value: 13 },
    ],
    volumeUnits: [
      { name: "EMEA", value: 250000 },
      { name: "AMERICAS", value: 160000 },
      { name: "CHINA", value: 120000 },
    ],
  },
  {
    msNumber: "MS000202",
    defaultPN: "KOS-1.20-MN66",
    parts: [
      {
        partNumber: "KOS-1.20-MN66",
        supplier: "KOSTAL",
        compatibilityAttribute: "Compatible",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.58 },
          { region: "AMERICAS", unitPrice: 0.6 },
          { region: "CHINA", unitPrice: 0.56 },
        ],
        currency: "EUR",
        contactSystem: "MCON 1.2",
        annualVolume: 410000,
      },
      {
        partNumber: "TE-1.20-FX22",
        supplier: "TE",
        compatibilityAttribute: "Compatible interface",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Not released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.61 },
          { region: "AMERICAS", unitPrice: 0.63 },
          { region: "CHINA", unitPrice: 0.59 },
        ],
        currency: "EUR",
        contactSystem: "MCON 1.2",
        annualVolume: 410000,
      },
      {
        partNumber: "MOL-1.20-PD88",
        supplier: "MOLEX",
        compatibilityAttribute: "Compatible",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Not released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Not released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.55 },
          { region: "AMERICAS", unitPrice: 0.57 },
          { region: "CHINA", unitPrice: 0.53 },
        ],
        currency: "EUR",
        contactSystem: "MCON 1.2",
        annualVolume: 410000,
      },
      {
        partNumber: "APT-1.20-RC10",
        supplier: "APTIV",
        compatibilityAttribute: "Compatible",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Released" },
          { oem: "Tesla", status: "Not released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.57 },
          { region: "AMERICAS", unitPrice: 0.58 },
          { region: "CHINA", unitPrice: 0.55 },
        ],
        currency: "EUR",
        contactSystem: "MCON 1.2",
        annualVolume: 410000,
      },
    ],
    volumeShare: [
      { name: "KOSTAL", value: 38 },
      { name: "TE", value: 24 },
      { name: "MOLEX", value: 21 },
      { name: "APTIV", value: 17 },
    ],
    volumeUnits: [
      { name: "EMEA", value: 180000 },
      { name: "AMERICAS", value: 125000 },
      { name: "CHINA", value: 105000 },
    ],
  },
  {
    msNumber: "MS000303",
    defaultPN: "BOS-2.80-UL07",
    parts: [
      {
        partNumber: "BOS-2.80-UL07",
        supplier: "BOSCH",
        compatibilityAttribute: "Compatible",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Released" },
          { oem: "Tesla", status: "Not released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.92 },
          { region: "AMERICAS", unitPrice: 0.95 },
          { region: "CHINA", unitPrice: 0.89 },
        ],
        currency: "EUR",
        contactSystem: "AK 2.8",
        annualVolume: 275000,
      },
      {
        partNumber: "TE-2.80-QX31",
        supplier: "TE",
        compatibilityAttribute: "Compatible",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Not released" },
          { oem: "VW", status: "Released" },
          { oem: "Mercedes-Benz", status: "Not released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.81 },
          { region: "AMERICAS", unitPrice: 0.84 },
          { region: "CHINA", unitPrice: 0.78 },
        ],
        currency: "EUR",
        contactSystem: "AK 2.8",
        annualVolume: 275000,
      },
      {
        partNumber: "YAZ-2.80-WA41",
        supplier: "YAZAKI",
        compatibilityAttribute: "Compatible interface",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Released" },
          { oem: "VW", status: "Not released" },
          { oem: "Mercedes-Benz", status: "Released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.88 },
          { region: "AMERICAS", unitPrice: 0.9 },
          { region: "CHINA", unitPrice: 0.86 },
        ],
        currency: "EUR",
        contactSystem: "AK 2.8",
        annualVolume: 275000,
      },
      {
        partNumber: "MOL-2.80-DR50",
        supplier: "MOLEX",
        compatibilityAttribute: "Compatible interface",
        oemReleaseStatuses: [
          { oem: "BMW", status: "Not released" },
          { oem: "VW", status: "Not released" },
          { oem: "Mercedes-Benz", status: "Released" },
          { oem: "Tesla", status: "Released" },
        ],
        regionalPrices: [
          { region: "EMEA", unitPrice: 0.76 },
          { region: "AMERICAS", unitPrice: 0.79 },
          { region: "CHINA", unitPrice: 0.74 },
        ],
        currency: "EUR",
        contactSystem: "AK 2.8",
        annualVolume: 275000,
      },
    ],
    volumeShare: [
      { name: "BOSCH", value: 41 },
      { name: "TE", value: 24 },
      { name: "YAZAKI", value: 20 },
      { name: "MOLEX", value: 15 },
    ],
    volumeUnits: [
      { name: "EMEA", value: 90000 },
      { name: "AMERICAS", value: 105000 },
      { name: "CHINA", value: 80000 },
    ],
  },
];

export function findGroupByMs(msNumber: string) {
  return msGroups.find((group) => group.msNumber === msNumber);
}

export function findGroupByPart(partNumber: string) {
  return msGroups.find((group) => group.parts.some((part) => part.partNumber === partNumber));
}

export function getDominantPartNumberByMs(msNumber: string) {
  const group = findGroupByMs(msNumber);
  if (!group) return null;

  const dominantSupplier = [...group.volumeShare].sort((a, b) => b.value - a.value)[0]?.name;
  const dominantPart = group.parts.find((part) => part.supplier === dominantSupplier);
  return dominantPart?.partNumber ?? group.defaultPN;
}

export function getAllPNs() {
  return msGroups.flatMap((group) => group.parts.map((part) => part.partNumber));
}

export function getAllMS() {
  return msGroups.map((group) => group.msNumber);
}

export function suggest(query: string): ComponentSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const pn = getAllPNs()
    .filter((value) => value.toLowerCase().includes(normalized))
    .map((value) => ({ type: "PN" as const, value }));

  const ms = getAllMS()
    .filter((value) => value.toLowerCase().includes(normalized))
    .map((value) => ({ type: "MS" as const, value }));

  return [...pn, ...ms];
}

export function getPriceRange(part: ComponentPart) {
  const prices = part.regionalPrices.map((entry) => entry.unitPrice);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function getRegionalPrice(part: ComponentPart, region: CommercialRegion) {
  return part.regionalPrices.find((entry) => entry.region === region)?.unitPrice ?? null;
}

function getRegionalWeightMap(part: ComponentPart) {
  const group = findGroupByPart(part.partNumber);
  const totalGroupVolume = group?.volumeUnits.reduce((sum, entry) => sum + entry.value, 0) ?? 0;

  return new Map(
    part.regionalPrices.map((entry) => {
      const matchingVolume = group?.volumeUnits.find((volume) => volume.name === entry.region)?.value ?? 0;
      const weight = totalGroupVolume > 0 ? matchingVolume / totalGroupVolume : 1 / Math.max(part.regionalPrices.length, 1);
      return [entry.region, weight];
    })
  );
}

export function getComparisonPrice(part: ComponentPart) {
  const weightMap = getRegionalWeightMap(part);
  return part.regionalPrices.reduce((sum, entry) => sum + entry.unitPrice * (weightMap.get(entry.region) ?? 0), 0);
}

export function getPriceBasis(part: ComponentPart) {
  return getComparisonPrice(part);
}

export function getOemReleaseOverview(part: ComponentPart) {
  const released = part.oemReleaseStatuses.filter((entry) => entry.status === "Released").length;
  const notReleased = part.oemReleaseStatuses.length - released;
  return { released, notReleased };
}

export function topCards(): TopCard[] {
  const byAnnualVolume = (group: ComponentGroup) => group.parts.reduce((total, part) => total + part.annualVolume, 0);
  const riskScore = (group: ComponentGroup) =>
    group.parts.filter((part) => part.oemReleaseStatuses.some((entry) => entry.status === "Not released")).length;
  const savingScore = (group: ComponentGroup) => {
    const prices = group.parts.map((part) => getPriceBasis(part));
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const annualVolume = group.parts[0]?.annualVolume ?? 0;
    return (max - min) * annualVolume;
  };

  const topVolumeGroup = [...msGroups].sort((a, b) => byAnnualVolume(b) - byAnnualVolume(a))[0];
  const topRiskGroup = [...msGroups].sort((a, b) => riskScore(b) - riskScore(a))[0];
  const topSavingGroup = [...msGroups].sort((a, b) => savingScore(b) - savingScore(a))[0];

  return [
    {
      kind: "volume",
      msNumber: topVolumeGroup?.msNumber ?? "MS000000",
      reason: "Largest annual volume in current dataset.",
    },
    {
      kind: "risk",
      msNumber: topRiskGroup?.msNumber ?? "MS000000",
      reason: "Highest count of alternatives with non-released OEMs.",
    },
    {
      kind: "saving",
      msNumber: topSavingGroup?.msNumber ?? "MS000000",
      reason: "Biggest estimated price-basis saving opportunity.",
    },
  ];
}
