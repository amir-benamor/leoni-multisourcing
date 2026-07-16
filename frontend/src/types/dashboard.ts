export type KpiKey =
  | "msGroupsInScope"
  | "criticalSingleSource"
  | "totalAnnualVolume";

export interface KpiItem {
  key: KpiKey;
  title: string;
  value: string;
  helper: string;
  tone: "positive" | "warning" | "critical" | "neutral";
  href?: string;
}

export interface DonutDatum {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface MarketShareDatum {
  supplier: string;
  share: number;
}

export type ComponentStatus = "Released" | "Tech only" | "Not released";
export type RiskLevel = "High" | "Medium" | "Low";

export interface PriorityRow {
  id: string;
  component: string;
  customer: string;
  currentSupplier: string;
  status: ComponentStatus;
  risk: RiskLevel;
  potentialSavings: number;
}

export type AlertSeverity = "High" | "Med" | "Info";

export interface AlertItem {
  id: string;
  label: string;
  severity: AlertSeverity;
  href: string;
}

export type ActionCategory = "High Risk" | "Fast Win" | "Savings" | "Data Quality";

export interface ActionBoardCard {
  id: string;
  category: ActionCategory;
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
  secondary: string;
  ctaLabel: string;
  href: string;
  trend: number[];
}

export interface RegionalFocusRow {
  msNumber: string;
  dominantSupplier: string;
  supplierShare: number;
  bestAvailability: "Released alternative available" | "Technical alternative only" | "No alternative available";
  annualVolume: number;
  href: string;
}

export type Region = "EMEA" | "AMERICAS" | "CHINA";

export interface DashboardData {
  totalAnnualVolume: string;
  msGroupsInScope: any;
  kpis: KpiItem[];
  maturity: DonutDatum[];
  maturityTotalGroups: number;
  marketShare: MarketShareDatum[];
  priorities: PriorityRow[];
  alerts: AlertItem[];
  actionBoardCards: ActionBoardCard[];
  concentrationHotspots: RegionalFocusRow[];
}