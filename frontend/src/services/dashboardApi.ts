// src/services/dashboardApi.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

export type KpiItem = {
  key: string;
  title: string;
  value: string;
  helper: string;
  tone: 'positive' | 'warning' | 'critical' | 'neutral';
  href?: string;
};

export type DonutDatum = {
  name: string;
  value: number;
  count: number;
  color: string;
};

export type MarketShareDatum = {
  supplier: string;
  share: number;
};

export type RegionalFocusRow = {
  msNumber: string;
  dominantSupplier: string;
  supplierShare: number;
  bestAvailability: string;
  annualVolume: number;
  href: string;
};

export type DashboardData = {
  kpis: KpiItem[];
  maturity: DonutDatum[];
  maturityTotalGroups: number;
  marketShare: MarketShareDatum[];
  concentrationHotspots: RegionalFocusRow[];
};

export type DashboardResponse = {
  success: boolean;
  data?: DashboardData;
  error?: string;
};

export const dashboardApi = {
  getData: async (customer: string, region: string): Promise<DashboardResponse> => {
    try {
      const params = new URLSearchParams();
      params.append('customer', customer);
      params.append('region', region);
      const response = await api.get(`/dashboard/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Dashboard API] Erreur:', error);
      return { success: false, error: error.message || 'Failed to load dashboard' };
    }
  },
};

export default api;