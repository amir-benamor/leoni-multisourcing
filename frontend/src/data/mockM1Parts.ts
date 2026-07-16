export type M1PartRecord = {
  id: string;
  leoniPn: string;
  supplierPn: string;
  supplier: string;
  description: string;
  materialGroup: string;
  classification: string;
  compatibilityType: "Compatible" | "Compatible interface";
  oemReleaseStatuses: Array<{ oem: string; status: "Released" | "Not released" }>;
  forsClassification?: string;
  contactSystem?: string;
  terminalType?: string;
  plating?: string;
  sealing?: string;
  oemApplicability: string[];
  projects: string[];
  accounts: string[];
  regions: string[];
  plants: string[];
  annualVolumeContext?: number;
  usageByAccount: Array<{
    name: string;
    percentage: number;
    projects: Array<{ name: string; percentage: number }>;
  }>;
  accountBreakdown: Array<{ name: string; percentage: number }>;
  projectBreakdown: Array<{ name: string; percentage: number }>;
  serverNumber?: string;
  annualVolumeByRegion: Array<{ name: string; volume: number }>;
  annualVolumeByPlant: Array<{ name: string; volume: number }>;
  annualVolumeByCountry: Array<{ name: string; volume: number }>;
  engineeringNotes?: string;
};

export type M1PartMatchType = "LEONI PN" | "Supplier PN";

export const mockM1Parts: M1PartRecord[] = [
  {
    id: "m1-001",
    leoniPn: "282100-1001",
    supplierPn: "TE-0.64-MS112-A1",
    supplier: "TE",
    description: "Female terminal MQS 0.64 tin plated",
    materialGroup: "MQS 0.64",
    classification: "Terminal",
    compatibilityType: "Compatible",
    oemReleaseStatuses: [
      { oem: "BMW", status: "Released" },
      { oem: "VW", status: "Released" },
      { oem: "Mercedes-Benz", status: "Not released" },
    ],
    forsClassification: "FORS-TER-064",
    contactSystem: "MQS 0.64",
    terminalType: "Female",
    plating: "Tin",
    sealing: "Unsealed",
    oemApplicability: ["BMW", "VW", "Mercedes-Benz"],
    projects: ["P-E39", "P-MQB"],
    accounts: ["Body harness", "Cockpit harness", "Door harness"],
    regions: ["EMEA", "AMERICAS"],
    plants: ["Nuremberg", "Tetovo"],
    annualVolumeContext: 460000,
    usageByAccount: [
      {
        name: "Body harness",
        percentage: 45,
        projects: [
          { name: "P-E39", percentage: 28 },
          { name: "P-MQB", percentage: 17 },
        ],
      },
      {
        name: "Cockpit harness",
        percentage: 35,
        projects: [
          { name: "P-E39", percentage: 18 },
          { name: "P-MQB", percentage: 17 },
        ],
      },
      {
        name: "Door harness",
        percentage: 20,
        projects: [
          { name: "P-E39", percentage: 14 },
          { name: "P-MQB", percentage: 6 },
        ],
      },
    ],
    accountBreakdown: [
      { name: "Body harness", percentage: 45 },
      { name: "Cockpit harness", percentage: 35 },
      { name: "Door harness", percentage: 20 },
    ],
    projectBreakdown: [
      { name: "P-E39", percentage: 60 },
      { name: "P-MQB", percentage: 40 },
    ],
    serverNumber: "SRV-EMEA-2821",
    annualVolumeByRegion: [
      { name: "EMEA", volume: 280000 },
      { name: "AMERICAS", volume: 180000 },
    ],
    annualVolumeByPlant: [
      { name: "Nuremberg", volume: 245000 },
      { name: "Tetovo", volume: 140000 },
      { name: "Mateur", volume: 75000 },
    ],
    annualVolumeByCountry: [
      { name: "Germany", volume: 245000 },
      { name: "North Macedonia", volume: 140000 },
      { name: "Tunisia", volume: 75000 },
    ],
    engineeringNotes: "Validated for standard MQS cavity and tab width 0.64.",
  },
  {
    id: "m1-002",
    leoniPn: "282100-1002",
    supplierPn: "APTIV-7781-22",
    supplier: "APTIV",
    description: "Female terminal MQS 0.64 silver plated",
    materialGroup: "MQS 0.64",
    classification: "Terminal",
    compatibilityType: "Compatible interface",
    oemReleaseStatuses: [
      { oem: "BMW", status: "Released" },
      { oem: "Bentley", status: "Released" },
      { oem: "Tesla", status: "Not released" },
    ],
    forsClassification: "FORS-TER-064",
    contactSystem: "MQS 0.64",
    terminalType: "Female",
    plating: "Silver",
    sealing: "Unsealed",
    oemApplicability: ["BMW", "Bentley", "Tesla"],
    projects: ["P-E39", "P-L560"],
    accounts: ["Engine harness", "Powertrain harness", "Sensor branch"],
    regions: ["EMEA"],
    plants: ["Marsa", "Kraljevo"],
    annualVolumeContext: 325000,
    usageByAccount: [
      {
        name: "Engine harness",
        percentage: 55,
        projects: [
          { name: "P-E39", percentage: 30 },
          { name: "P-L560", percentage: 25 },
        ],
      },
      {
        name: "Powertrain harness",
        percentage: 25,
        projects: [
          { name: "P-E39", percentage: 12 },
          { name: "P-L560", percentage: 13 },
        ],
      },
      {
        name: "Sensor branch",
        percentage: 20,
        projects: [
          { name: "P-E39", percentage: 10 },
          { name: "P-L560", percentage: 10 },
        ],
      },
    ],
    accountBreakdown: [
      { name: "Engine harness", percentage: 55 },
      { name: "Powertrain harness", percentage: 25 },
      { name: "Sensor branch", percentage: 20 },
    ],
    projectBreakdown: [
      { name: "P-E39", percentage: 52 },
      { name: "P-L560", percentage: 48 },
    ],
    serverNumber: "SRV-EMEA-2822",
    annualVolumeByRegion: [{ name: "EMEA", volume: 325000 }],
    annualVolumeByPlant: [
      { name: "Marsa", volume: 185000 },
      { name: "Kraljevo", volume: 140000 },
    ],
    annualVolumeByCountry: [
      { name: "Tunisia", volume: 185000 },
      { name: "Serbia", volume: 140000 },
    ],
    engineeringNotes: "Preferred for lower resistance requirement on selected engine variants.",
  },
  {
    id: "m1-003",
    leoniPn: "312450-8804",
    supplierPn: "KOSTAL-443210",
    supplier: "KOSTAL",
    description: "Tab terminal MCON 1.2 sealed",
    materialGroup: "MCON 1.2",
    classification: "Terminal",
    compatibilityType: "Compatible",
    oemReleaseStatuses: [
      { oem: "Renault", status: "Not released" },
      { oem: "Mercedes-Benz", status: "Released" },
      { oem: "Tesla", status: "Not released" },
    ],
    forsClassification: "FORS-TER-120",
    contactSystem: "MCON 1.2",
    terminalType: "Tab",
    plating: "Tin",
    sealing: "Sealed",
    oemApplicability: ["Renault", "Mercedes-Benz", "Tesla"],
    projects: ["P-CMF", "P-STLA"],
    accounts: ["Underhood harness", "Engine bay", "Cooling branch"],
    regions: ["EMEA", "CHINA"],
    plants: ["Sousse", "Shenyang"],
    annualVolumeContext: 410000,
    usageByAccount: [
      {
        name: "Underhood harness",
        percentage: 50,
        projects: [
          { name: "P-CMF", percentage: 30 },
          { name: "P-STLA", percentage: 20 },
        ],
      },
      {
        name: "Engine bay",
        percentage: 30,
        projects: [
          { name: "P-CMF", percentage: 18 },
          { name: "P-STLA", percentage: 12 },
        ],
      },
      {
        name: "Cooling branch",
        percentage: 20,
        projects: [
          { name: "P-CMF", percentage: 10 },
          { name: "P-STLA", percentage: 10 },
        ],
      },
    ],
    accountBreakdown: [
      { name: "Underhood harness", percentage: 50 },
      { name: "Engine bay", percentage: 30 },
      { name: "Cooling branch", percentage: 20 },
    ],
    projectBreakdown: [
      { name: "P-CMF", percentage: 58 },
      { name: "P-STLA", percentage: 42 },
    ],
    serverNumber: "SRV-CN-3124",
    annualVolumeByRegion: [
      { name: "EMEA", volume: 240000 },
      { name: "CHINA", volume: 170000 },
    ],
    annualVolumeByPlant: [
      { name: "Sousse", volume: 240000 },
      { name: "Shenyang", volume: 170000 },
    ],
    annualVolumeByCountry: [
      { name: "Tunisia", volume: 240000 },
      { name: "China", volume: 170000 },
    ],
    engineeringNotes: "Sealed execution for underhood temperature and splash constraints.",
  },
  {
    id: "m1-004",
    leoniPn: "457900-2210",
    supplierPn: "MOLEX-2210-DR50",
    supplier: "MOLEX",
    description: "Power terminal AK 2.8 brass",
    materialGroup: "AK 2.8",
    classification: "Power terminal",
    compatibilityType: "Compatible interface",
    oemReleaseStatuses: [
      { oem: "VW", status: "Not released" },
      { oem: "Bentley", status: "Released" },
      { oem: "Tesla", status: "Not released" },
    ],
    forsClassification: "FORS-PWR-280",
    contactSystem: "AK 2.8",
    terminalType: "Female",
    plating: "Tin",
    sealing: "Unsealed",
    oemApplicability: ["VW", "Bentley", "Tesla"],
    projects: ["P-MEB"],
    accounts: ["Battery harness", "Power distribution"],
    regions: ["EMEA"],
    plants: ["Roth", "Pitesti"],
    annualVolumeContext: 180000,
    usageByAccount: [
      {
        name: "Battery harness",
        percentage: 70,
        projects: [{ name: "P-MEB", percentage: 70 }],
      },
      {
        name: "Power distribution",
        percentage: 30,
        projects: [{ name: "P-MEB", percentage: 30 }],
      },
    ],
    accountBreakdown: [
      { name: "Battery harness", percentage: 70 },
      { name: "Power distribution", percentage: 30 },
    ],
    projectBreakdown: [{ name: "P-MEB", percentage: 100 }],
    serverNumber: "SRV-EMEA-4579",
    annualVolumeByRegion: [{ name: "EMEA", volume: 180000 }],
    annualVolumeByPlant: [
      { name: "Roth", volume: 95000 },
      { name: "Pitesti", volume: 85000 },
    ],
    annualVolumeByCountry: [
      { name: "Germany", volume: 95000 },
      { name: "Romania", volume: 85000 },
    ],
    engineeringNotes: "Used on higher-current branch applications with reinforced crimp barrel.",
  },
];

function includesNormalized(value: string, query: string) {
  return value.trim().toLowerCase() === query.trim().toLowerCase();
}

export function findM1PartByQuery(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;
  return mockM1Parts.find(
    (part) => includesNormalized(part.leoniPn, normalized) || includesNormalized(part.supplierPn, normalized)
  );
}

export function findM1PartMatch(query: string): { part: M1PartRecord; matchType: M1PartMatchType } | undefined {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;

  const matchedByLeoni = mockM1Parts.find((part) => includesNormalized(part.leoniPn, normalized));
  if (matchedByLeoni) {
    return { part: matchedByLeoni, matchType: "LEONI PN" };
  }

  const matchedBySupplier = mockM1Parts.find((part) => includesNormalized(part.supplierPn, normalized));
  if (matchedBySupplier) {
    return { part: matchedBySupplier, matchType: "Supplier PN" };
  }

  return undefined;
}

export function listM1PartExamples() {
  return mockM1Parts.slice(0, 4).map((part) => part.leoniPn);
}

export function listM1MixedExamples() {
  return [
    mockM1Parts[0]?.leoniPn,
    mockM1Parts[1]?.supplierPn,
    mockM1Parts[2]?.leoniPn,
    mockM1Parts[3]?.supplierPn,
  ].filter((value): value is string => Boolean(value));
}
