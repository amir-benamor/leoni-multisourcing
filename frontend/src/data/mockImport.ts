export type ImportIssue = {
  row: number;
  column: string;
  severity: "Error" | "Warning";
  message: string;
  suggestion: string;
};

export type ImportRun = {
  id: string;
  date: string;
  status: "Done" | "Done with warnings" | "Failed";
  rows: number;
  errors: number;
};

export const mockFiles: Array<{
  id: string;
  name: string;
  type: "csv" | "xlsx";
  size: number;
  date: string;
}> = [];

export const mockColumns = [
  "part_number",
  "ms_number",
  "supplier",
  "price_eur",
  "volume_annual",
  "region",
  "customer",
  "status",
] as const;

export const targetFields = [
  "part_number",
  "ms_number",
  "supplier",
  "price_eur",
  "volume_annual",
  "region",
  "customer",
  "status",
  "currency",
  "contact_system",
  "snapshot",
] as const;

export const mockIssues: ImportIssue[] = [
  {
    row: 12,
    column: "price_eur",
    severity: "Error",
    message: "Invalid number format",
    suggestion: "Use dot decimal separator (e.g. 0.42).",
  },
  {
    row: 44,
    column: "supplier",
    severity: "Warning",
    message: "Unknown supplier alias",
    suggestion: "Map alias to a supplier from master list.",
  },
  {
    row: 87,
    column: "ms_number",
    severity: "Error",
    message: "MS number missing",
    suggestion: "Fill MS group before import.",
  },
  {
    row: 130,
    column: "region",
    severity: "Warning",
    message: "Region value normalized",
    suggestion: "Check if EMEA/AMERICAS/CHINA mapping is expected.",
  },
];

export const mockRuns: ImportRun[] = [
  { id: "run-2026-02-25-1", date: "2026-02-25 10:12", status: "Done", rows: 12540, errors: 0 },
  { id: "run-2026-02-24-1", date: "2026-02-24 17:03", status: "Done with warnings", rows: 11890, errors: 0 },
  { id: "run-2026-02-22-1", date: "2026-02-22 09:41", status: "Failed", rows: 7200, errors: 18 },
];
