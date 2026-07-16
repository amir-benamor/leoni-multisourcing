import type { PurchaseRegion, UsageMarket } from "./mockBusinessCase";

export type HistoryIssue = {
  severity: "Error" | "Warning";
  column: string;
  message: string;
  suggestion: string;
};

export type ImportTimelineStep = {
  name: "Upload" | "Cleaning" | "Detection" | "Validation" | "Import";
  status: "done" | "failed" | "in_progress" | "pending";
};

export type ImportRun = {
  id: string;
  createdAt: string;
  status: "Done" | "Failed" | "Validating" | "Importing";
  files: string[];
  rowsTotal: number;
  rowsImported: number;
  errors: number;
  warnings: number;
  cleaningSummary: {
    trimmed: number;
    regionNormalized: number;
    numericNormalized: number;
    supplierNormalized: number;
  };
  timeline: ImportTimelineStep[];
  issues: HistoryIssue[];
};

export type BusinessCaseHistory = {
  id: string;
  createdAt: string;
  msNumber: string;
  fromSupplier: string;
  toSupplier: string;
  purchaseRegion: PurchaseRegion;
  usageMarket: UsageMarket;
  annualSaving: number;
  eligibility: "Eligible" | "Restricted" | "Pending";
  status: "Draft" | "Saved" | "Archived";
};

export type ActivityItem = {
  id: string;
  createdAt: string;
  type: "import" | "scenario" | "task";
  title: string;
  subtitle: string;
  runId?: string;
  msNumber?: string;
};

export const importsRuns: ImportRun[] = [
  {
    id: "RUN-00023",
    createdAt: "2026-02-26T09:12:00Z",
    status: "Done",
    files: ["parts_alt_20260226.csv", "prices_20260226.xlsx", "volumes_q1.csv"],
    rowsTotal: 12680,
    rowsImported: 12630,
    errors: 0,
    warnings: 12,
    cleaningSummary: { trimmed: 1480, regionNormalized: 335, numericNormalized: 602, supplierNormalized: 98 },
    timeline: [
      { name: "Upload", status: "done" },
      { name: "Cleaning", status: "done" },
      { name: "Detection", status: "done" },
      { name: "Validation", status: "done" },
      { name: "Import", status: "done" },
    ],
    issues: [
      { severity: "Warning", column: "supplier", message: "Supplier alias normalized", suggestion: "Review alias mapping table." },
      { severity: "Warning", column: "region", message: "Region normalized to AMERICAS", suggestion: "Check source region format." },
    ],
  },
  {
    id: "RUN-00022",
    createdAt: "2026-02-25T14:41:00Z",
    status: "Failed",
    files: ["parts_alt_20260225.csv", "prices_20260225.csv"],
    rowsTotal: 8540,
    rowsImported: 0,
    errors: 26,
    warnings: 4,
    cleaningSummary: { trimmed: 745, regionNormalized: 112, numericNormalized: 221, supplierNormalized: 0 },
    timeline: [
      { name: "Upload", status: "done" },
      { name: "Cleaning", status: "done" },
      { name: "Detection", status: "done" },
      { name: "Validation", status: "failed" },
      { name: "Import", status: "pending" },
    ],
    issues: [
      { severity: "Error", column: "ms_number", message: "MS number missing", suggestion: "Populate ms_number for all rows." },
      { severity: "Error", column: "price_eur", message: "Invalid numeric value", suggestion: "Use numeric format with decimal point." },
    ],
  },
  {
    id: "RUN-00021",
    createdAt: "2026-02-24T08:03:00Z",
    status: "Importing",
    files: ["parts_alt_20260224.csv", "prices_20260224.xlsx", "volumes_q1.csv", "supplier_master.xlsx"],
    rowsTotal: 13210,
    rowsImported: 8820,
    errors: 0,
    warnings: 3,
    cleaningSummary: { trimmed: 1910, regionNormalized: 404, numericNormalized: 675, supplierNormalized: 284 },
    timeline: [
      { name: "Upload", status: "done" },
      { name: "Cleaning", status: "done" },
      { name: "Detection", status: "done" },
      { name: "Validation", status: "done" },
      { name: "Import", status: "in_progress" },
    ],
    issues: [{ severity: "Warning", column: "customer", message: "Customer alias normalized", suggestion: "Review customer master mappings." }],
  },
];

export const businessCases: BusinessCaseHistory[] = [
  {
    id: "BC-0009",
    createdAt: "2026-02-26T11:20:00Z",
    msNumber: "MS000112",
    fromSupplier: "TE",
    toSupplier: "APTIV",
    purchaseRegion: "EMEA",
    usageMarket: "EMEA",
    annualSaving: 382000,
    eligibility: "Eligible",
    status: "Saved",
  },
  {
    id: "BC-0008",
    createdAt: "2026-02-25T16:05:00Z",
    msNumber: "MS000202",
    fromSupplier: "KOSTAL",
    toSupplier: "TE",
    purchaseRegion: "CHINA",
    usageMarket: "ASIA",
    annualSaving: 214000,
    eligibility: "Pending",
    status: "Saved",
  },
  {
    id: "BC-0007",
    createdAt: "2026-02-24T13:44:00Z",
    msNumber: "MS000101",
    fromSupplier: "TE",
    toSupplier: "MOLEX",
    purchaseRegion: "AMERICAS",
    usageMarket: "GLOBAL",
    annualSaving: 167000,
    eligibility: "Restricted",
    status: "Saved",
  },
];

export const activity: ActivityItem[] = [
  {
    id: "ACT-1",
    createdAt: "2026-02-26T09:17:00Z",
    type: "import",
    title: "Import completed: RUN-00023",
    subtitle: "12,630 rows imported with 12 warnings.",
    runId: "RUN-00023",
  },
  {
    id: "ACT-2",
    createdAt: "2026-02-26T10:42:00Z",
    type: "scenario",
    title: "Scenario saved: MS000112 TE->APTIV",
    subtitle: "Annual saving estimate updated to EUR 382,000.",
    msNumber: "MS000112",
  },
  {
    id: "ACT-3",
    createdAt: "2026-02-26T11:11:00Z",
    type: "task",
    title: "Task status updated: 'Confirm CPA' -> Ongoing",
    subtitle: "Owner changed to Program.",
  },
];
