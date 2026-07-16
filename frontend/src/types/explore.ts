export type BreakdownOption = "Global" | "Customer" | "Region" | "Component classification" | "TAB width";

export type SupplierKey = "TE" | "APTIV" | "MOLEX" | "YAZAKI" | "KOSTAL" | "LEAR" | "BOSCH" | "JST" | "KET" | "Others";

export type MatrixStatus =
  | "released-compatible"
  | "released-interface"
  | "not-released-compatible"
  | "not-released-interface";

export interface CoverageKpi {
  key: "scope" | "critical" | "released-ready";
  label: string;
  value: string;
  helper: string;
  tone: "neutral" | "critical" | "positive";
}

export interface ExploreChartDatum {
  name: string;
  value: number;
}

export interface MatrixCell {
  materialGroup: string;
  status: MatrixStatus;
}

export interface StatusMatrixRow {
  contactSystem: string;
  tabWidth: string;
  customers?: string[];
  volume2026: number;
  share: number;
  cells: Record<SupplierKey, MatrixCell | null>;
}

export interface MsGroupRow {
  msNumber: string;
  tabWidth: string;
  customers?: string[];
  alternativesCount: number;
  bestAvailability: "Released alternative available" | "Technical alternative only" | "No alternative available";
  bestAvailabilityByCustomer?: Record<string, "Released alternative available" | "Technical alternative only" | "No alternative available">;
  topSupplierShare?: number;
  topSupplierShareByCustomer?: Record<string, number>;
  totalVolume: number;
}

export interface PartRow {
  partNumber: string;
  msNumber: string;
  tabWidth?: string;
  customers?: string[];
  supplier: string;
  materialGroup: string;
  status:
    | "Released / Compatible"
    | "Released / Comp. interface"
    | "Not released / Compatible"
    | "Not released / Comp. interface";
  statusByCustomer?: Record<
    string,
    | "Released / Compatible"
    | "Released / Comp. interface"
    | "Not released / Compatible"
    | "Not released / Comp. interface"
  >;
  volume: number;
}

export interface ExploreData {
  breakdownOptions: BreakdownOption[];
  classificationOptions: Array<{ label: string; value: string; enabled: boolean }>;
  tabWidthOptions: string[];
  coverageKpis: CoverageKpi[];
  statusMatrixRows: StatusMatrixRow[];
  resultsMsGroups: MsGroupRow[];
  resultsParts: PartRow[];
}
