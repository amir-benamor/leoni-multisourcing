import type { DashboardData, Region } from "../types/dashboard";

function hashString(value: string) {
  return [...value].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

type BaseDashboardData = {
  kpis: DashboardData["kpis"];
  maturity: DashboardData["maturity"];
  maturityTotalGroups: number;
  marketShare: DashboardData["marketShare"];
  concentrationHotspots: DashboardData["concentrationHotspots"];
  actionBoardCards: DashboardData["actionBoardCards"];
};

const baseByRegion: Record<Region, BaseDashboardData> = {
  EMEA: {
    kpis: [
      {
        key: "msGroupsInScope",
        title: "MS groups in scope",
        value: "269",
        helper: "Total MS groups in the selected perimeter",
        tone: "neutral",
      },
      {
        key: "criticalSingleSource",
        title: "Critical single-source items",
        value: "143",
        helper: "Items needing priority mitigation",
        tone: "critical",
        href: "/app/explore?view=critical",
      },
      {
        key: "totalAnnualVolume",
        title: "Total annual volume",
        value: "2,113,000",
        helper: "Estimated annual volume across all MS groups",
        tone: "neutral",
      },
    ],
    maturity: [
      { name: "Released-ready", value: 55.2, count: 149, color: "#1562e0" },
      { name: "Technical-only", value: 27.0, count: 73, color: "#7cb2ff" },
      { name: "Unsecured", value: 17.8, count: 48, color: "#d9e8ff" },
    ],
    maturityTotalGroups: 269,
    marketShare: [
      { supplier: "TE", share: 28 },
      { supplier: "APTIV", share: 21 },
      { supplier: "MOLEX", share: 16 },
      { supplier: "YAZAKI", share: 13 },
      { supplier: "KOSTAL", share: 9 },
      { supplier: "Others", share: 13 },
    ],
    concentrationHotspots: [
      { msNumber: "MS000155", dominantSupplier: "TE", supplierShare: 96, bestAvailability: "No alternative available", annualVolume: 398000, href: "/app/explore?ms=MS000155&view=matrix" },
      { msNumber: "MS000166", dominantSupplier: "KOSTAL", supplierShare: 95, bestAvailability: "Technical alternative only", annualVolume: 289000, href: "/app/explore?ms=MS000166&view=matrix" },
      { msNumber: "MS000141", dominantSupplier: "MOLEX", supplierShare: 88, bestAvailability: "Released alternative available", annualVolume: 530000, href: "/app/explore?ms=MS000141&view=matrix" },
      { msNumber: "MS000123", dominantSupplier: "TE", supplierShare: 85, bestAvailability: "Released alternative available", annualVolume: 646000, href: "/app/explore?ms=MS000123&view=matrix" },
      { msNumber: "MS000112", dominantSupplier: "APTIV", supplierShare: 79, bestAvailability: "Technical alternative only", annualVolume: 252000, href: "/app/explore?ms=MS000112&view=matrix" },
    ],
    actionBoardCards: [
      { id: "ac-1", category: "High Risk", title: "Critical single-source exposure", description: "Hotspots where one supplier dominates nearly all annual volume in the selected scope.", metric: "142", metricLabel: "critical items", secondary: "Prioritize mitigation on the highest dependency MS groups.", ctaLabel: "Review in Explore", href: "/app/explore?view=critical", trend: [121, 127, 131, 142] },
      { id: "ac-2", category: "Fast Win", title: "Tech alternatives ready for release", description: "Alternatives exist technically and now need OEM release focus.", metric: "62", metricLabel: "groups to release", secondary: "Convert technical availability into released-ready coverage.", ctaLabel: "Open Status Matrix", href: "/app/explore?view=matrix&filter=tech-only", trend: [44, 49, 56, 62] },
      { id: "ac-3", category: "Savings", title: "High savings scenarios", description: "Priority MS groups where commercial switching potential is highest.", metric: "EUR480k", metricLabel: "estimated / year", secondary: "Move the strongest cases into Business Case creation.", ctaLabel: "Create Business Case", href: "/app/business-case?source=dashboard&mode=top-savings", trend: [280, 340, 410, 480] },
      { id: "ac-4", category: "Data Quality", title: "Missing data detected", description: "Gaps in import or scope data still reduce decision confidence.", metric: "2", metricLabel: "scope issues", secondary: "Resolve missing volumes and snapshots before scaling decisions.", ctaLabel: "Go to Import", href: "/app/import?issue=missing-volumes", trend: [5, 4, 3, 2] },
    ],
  },
  AMERICAS: {
    kpis: [
      {
        key: "msGroupsInScope",
        title: "MS groups in scope",
        value: "228",
        helper: "Total MS groups in the selected perimeter",
        tone: "neutral",
      },
      {
        key: "criticalSingleSource",
        title: "Critical single-source items",
        value: "118",
        helper: "Items needing priority mitigation",
        tone: "critical",
        href: "/app/explore?view=critical",
      },
      {
        key: "totalAnnualVolume",
        title: "Total annual volume",
        value: "1,842,000",
        helper: "Estimated annual volume across all MS groups",
        tone: "neutral",
      },
    ],
    maturity: [
      { name: "Released-ready", value: 61.9, count: 141, color: "#1562e0" },
      { name: "Technical-only", value: 24.6, count: 56, color: "#7cb2ff" },
      { name: "Unsecured", value: 13.6, count: 31, color: "#d9e8ff" },
    ],
    maturityTotalGroups: 228,
    marketShare: [
      { supplier: "APTIV", share: 28 },
      { supplier: "TE", share: 24 },
      { supplier: "MOLEX", share: 17 },
      { supplier: "KOSTAL", share: 10 },
      { supplier: "YAZAKI", share: 9 },
      { supplier: "Others", share: 12 },
    ],
    concentrationHotspots: [
      { msNumber: "MS000210", dominantSupplier: "APTIV", supplierShare: 97, bestAvailability: "Technical alternative only", annualVolume: 520000, href: "/app/explore?ms=MS000210&view=matrix" },
      { msNumber: "MS000233", dominantSupplier: "TE", supplierShare: 94, bestAvailability: "Released alternative available", annualVolume: 615000, href: "/app/explore?ms=MS000233&view=matrix" },
      { msNumber: "MS000241", dominantSupplier: "MOLEX", supplierShare: 91, bestAvailability: "No alternative available", annualVolume: 275000, href: "/app/explore?ms=MS000241&view=matrix" },
      { msNumber: "MS000259", dominantSupplier: "KOSTAL", supplierShare: 86, bestAvailability: "Technical alternative only", annualVolume: 330000, href: "/app/explore?ms=MS000259&view=matrix" },
      { msNumber: "MS000264", dominantSupplier: "TE", supplierShare: 81, bestAvailability: "Released alternative available", annualVolume: 402000, href: "/app/explore?ms=MS000264&view=matrix" },
    ],
    actionBoardCards: [
      { id: "ac-1", category: "High Risk", title: "Critical single-source exposure", description: "Supplier dependency remains concentrated on a small set of high-volume groups.", metric: "118", metricLabel: "critical items", secondary: "Escalate the dominant hotspots first.", ctaLabel: "Review in Explore", href: "/app/explore?view=critical", trend: [104, 108, 113, 118] },
      { id: "ac-2", category: "Fast Win", title: "Tech alternatives ready for release", description: "Technical options are available and can quickly improve released-ready coverage.", metric: "49", metricLabel: "groups to release", secondary: "Focus on release-ready conversion in the current customer scope.", ctaLabel: "Open Status Matrix", href: "/app/explore?view=matrix&filter=tech-only", trend: [34, 38, 44, 49] },
      { id: "ac-3", category: "Savings", title: "High savings scenarios", description: "Commercial deltas and annual volumes point to attractive switching cases.", metric: "EUR390k", metricLabel: "estimated / year", secondary: "Package the strongest opportunities into business cases.", ctaLabel: "Create Business Case", href: "/app/business-case?source=dashboard&mode=top-savings", trend: [250, 290, 345, 390] },
      { id: "ac-4", category: "Data Quality", title: "Missing data detected", description: "A small number of scope gaps still reduce full dashboard coverage.", metric: "3", metricLabel: "scope issues", secondary: "Complete missing records before broad action rollout.", ctaLabel: "Go to Import", href: "/app/import?issue=missing-volumes", trend: [6, 5, 4, 3] },
    ],
  },
  CHINA: {
    kpis: [
      {
        key: "msGroupsInScope",
        title: "MS groups in scope",
        value: "242",
        helper: "Total MS groups in the selected perimeter",
        tone: "neutral",
      },
      {
        key: "criticalSingleSource",
        title: "Critical single-source items",
        value: "176",
        helper: "Items needing priority mitigation",
        tone: "critical",
        href: "/app/explore?view=critical",
      },
      {
        key: "totalAnnualVolume",
        title: "Total annual volume",
        value: "1,911,000",
        helper: "Estimated annual volume across all MS groups",
        tone: "neutral",
      },
    ],
    maturity: [
      { name: "Released-ready", value: 50.4, count: 122, color: "#1562e0" },
      { name: "Technical-only", value: 31.0, count: 75, color: "#7cb2ff" },
      { name: "Unsecured", value: 18.6, count: 45, color: "#d9e8ff" },
    ],
    maturityTotalGroups: 242,
    marketShare: [
      { supplier: "YAZAKI", share: 25 },
      { supplier: "TE", share: 22 },
      { supplier: "APTIV", share: 18 },
      { supplier: "MOLEX", share: 14 },
      { supplier: "KOSTAL", share: 8 },
      { supplier: "Others", share: 13 },
    ],
    concentrationHotspots: [
      { msNumber: "MS000310", dominantSupplier: "YAZAKI", supplierShare: 99, bestAvailability: "No alternative available", annualVolume: 450000, href: "/app/explore?ms=MS000310&view=matrix" },
      { msNumber: "MS000325", dominantSupplier: "TE", supplierShare: 95, bestAvailability: "Technical alternative only", annualVolume: 610000, href: "/app/explore?ms=MS000325&view=matrix" },
      { msNumber: "MS000342", dominantSupplier: "APTIV", supplierShare: 89, bestAvailability: "Released alternative available", annualVolume: 365000, href: "/app/explore?ms=MS000342&view=matrix" },
      { msNumber: "MS000359", dominantSupplier: "MOLEX", supplierShare: 84, bestAvailability: "Technical alternative only", annualVolume: 288000, href: "/app/explore?ms=MS000359&view=matrix" },
      { msNumber: "MS000367", dominantSupplier: "YAZAKI", supplierShare: 82, bestAvailability: "No alternative available", annualVolume: 198000, href: "/app/explore?ms=MS000367&view=matrix" },
    ],
    actionBoardCards: [
      { id: "ac-1", category: "High Risk", title: "Critical single-source exposure", description: "The selected perimeter still includes several near-monopoly supplier positions.", metric: "176", metricLabel: "critical items", secondary: "Start with no-alternative hotspots at the top of the list.", ctaLabel: "Review in Explore", href: "/app/explore?view=critical", trend: [152, 159, 166, 176] },
      { id: "ac-2", category: "Fast Win", title: "Tech alternatives ready for release", description: "Release focus can materially shift coverage on currently exposed groups.", metric: "71", metricLabel: "groups to release", secondary: "Accelerate the highest-volume technical-only cases.", ctaLabel: "Open Status Matrix", href: "/app/explore?view=matrix&filter=tech-only", trend: [48, 54, 63, 71] },
      { id: "ac-3", category: "Savings", title: "High savings scenarios", description: "The strongest sourcing moves still sit in a focused subset of MS groups.", metric: "EUR520k", metricLabel: "estimated / year", secondary: "Move high-confidence opportunities into Business Case.", ctaLabel: "Create Business Case", href: "/app/business-case?source=dashboard&mode=top-savings", trend: [300, 360, 430, 520] },
      { id: "ac-4", category: "Data Quality", title: "Missing data detected", description: "Volume and release completeness still need cleanup in part of the scope.", metric: "4", metricLabel: "scope issues", secondary: "Close the missing-data loop before final governance review.", ctaLabel: "Go to Import", href: "/app/import?issue=missing-volumes", trend: [7, 6, 5, 4] },
    ],
  },
};

function withScopedPercentage(base: number, seed: number, range: number, min = 0, max = 99.9) {
  const next = base + ((seed % (range * 20 + 1)) - range * 10) / 10;
  return Number(Math.max(min, Math.min(max, next)).toFixed(1));
}

function sortHotspots(data: DashboardData["concentrationHotspots"]) {
  return [...data].sort((a, b) => {
    if (b.supplierShare !== a.supplierShare) return b.supplierShare - a.supplierShare;
    return b.annualVolume - a.annualVolume;
  });
}

export function getDashboardData(region: Region, customer: string, snapshot: string): DashboardData {
  const base = baseByRegion[region];
  const seed = hashString(`${region}-${customer}-${snapshot}`);
  const snapshotFactor = snapshot === "Previous import" ? 0.97 : 1;
  
  const msGroupsInScope = Math.max(40, Math.round(parseInt(base.kpis[0].value, 10) * snapshotFactor + ((seed % 9) - 4)));
  const criticalItems = Math.max(12, Math.round(parseInt(base.kpis[1].value, 10) * snapshotFactor + ((seed % 11) - 5)));
  const totalAnnualVolume = Math.round(parseInt(base.kpis[2].value.replace(/,/g, ""), 10) * snapshotFactor + ((seed % 10001) - 5000));

  const maturityTotalGroups = msGroupsInScope;
  const releasedReady = withScopedPercentage(55, seed, 2.5, 45, 90);
  const technicalOnly = withScopedPercentage(27, seed + 19, 1.8, 8, 30);
  const unsecured = Number(Math.max(0.5, 100 - releasedReady - technicalOnly).toFixed(1));

  const releasedReadyCount = Math.round(maturityTotalGroups * (releasedReady / 100));
  const technicalOnlyCount = Math.round(maturityTotalGroups * (technicalOnly / 100));
  const unsecuredCount = Math.max(0, maturityTotalGroups - releasedReadyCount - technicalOnlyCount);

  const marketShift = ((seed % 7) - 3) * 0.6;
  const marketShare = [...base.marketShare]
    .map((row, index) => ({
      ...row,
      share: Math.max(3, Number((row.share + (index === 0 ? marketShift : index === 1 ? -marketShift / 2 : 0)).toFixed(1))),
    }))
    .sort((a, b) => b.share - a.share);
  const marketShareTotal = marketShare.reduce((sum, row) => sum + row.share, 0) || 1;
  const normalizedMarketShare = marketShare.map((row, index) => {
    if (index === marketShare.length - 1) {
      const previous = marketShare.slice(0, -1).reduce((sum, item) => sum + Number(((item.share / marketShareTotal) * 100).toFixed(1)), 0);
      return { ...row, share: Number((100 - previous).toFixed(1)) };
    }
    return { ...row, share: Number(((row.share / marketShareTotal) * 100).toFixed(1)) };
  });

  const concentrationHotspots = sortHotspots(
    base.concentrationHotspots.map((row, index) => ({
      ...row,
      supplierShare: Math.max(52, Math.min(99, row.supplierShare + ((seed + index) % 5) - 2)),
      annualVolume: Math.round(row.annualVolume * snapshotFactor) + (((seed + index) % 5) - 2) * 6000,
    }))
  );

  return {
    totalAnnualVolume: `${totalAnnualVolume.toLocaleString("en-US")} units`,
    msGroupsInScope: null,
    kpis: [
      { ...base.kpis[0], value: msGroupsInScope.toLocaleString("en-US") },
      { ...base.kpis[1], value: `${criticalItems}` },
      { ...base.kpis[2], value: totalAnnualVolume.toLocaleString("en-US") },
    ],
    maturity: [
      { ...base.maturity[0], value: releasedReady, count: releasedReadyCount },
      { ...base.maturity[1], value: technicalOnly, count: technicalOnlyCount },
      { ...base.maturity[2], value: unsecured, count: unsecuredCount },
    ],
    maturityTotalGroups,
    marketShare: normalizedMarketShare,
    concentrationHotspots,
    actionBoardCards: base.actionBoardCards.map((card, index) => {
      const metricAdjustment = ((seed + index) % 4) - 1;
      if (card.category === "Savings") {
        const numeric = Number(card.metric.replace(/[^\d]/g, ""));
        return {
          ...card,
          metric: `EUR${(numeric + metricAdjustment * 20).toLocaleString("en-US")}k`,
        };
      }
      if (/^\d+$/.test(card.metric)) {
        return {
          ...card,
          metric: `${Math.max(1, Number(card.metric) + metricAdjustment)}`,
        };
      }
      return card;
    }),
    priorities: [],
    alerts: [],
  };
}

export const dashboardByRegion: Record<Region, DashboardData> = {
  EMEA: getDashboardData("EMEA", "Stellantis", "Latest import"),
  AMERICAS: getDashboardData("AMERICAS", "Stellantis", "Latest import"),
  CHINA: getDashboardData("CHINA", "Stellantis", "Latest import"),
};

export const mockDashboardData = dashboardByRegion.EMEA;