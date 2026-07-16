// src/services/exploreApi.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour logger les requêtes
api.interceptors.request.use(
  (config) => {
    console.log(`📤 [Explore API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour logger les réponses
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [Explore API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ [Explore API Error] ${error.response?.status || 'Network'} ${error.config?.url}`);
    return Promise.reject(error);
  }
);

// ========== TYPES ==========

export type ClassificationsResponse = {
  success: boolean;
  data?: {
    classifications: string[];
  };
  error?: string;
};

export type CoverageKpi = {
  key: string;
  label: string;
  value: string;
  helper: string;
  tone: "neutral" | "critical" | "positive";
};

export type CoverageKpisData = {
  filters_applied: {
    customer: string;
    region: string;
    material_group: string;
  };
  coverage_kpis: CoverageKpi[];
};

export type CoverageKpisResponse = {
  success: boolean;
  data?: CoverageKpisData;
  error?: string;
};

export type MarketShareData = {
  market_share: { name: string; value: number }[];
  supplier_volume: { name: string; value: number }[];
};

export type MarketShareResponse = {
  success: boolean;
  data?: MarketShareData;
  error?: string;
};

export type MatrixCell = {
  classification: string | null;
  color: string | null;
  status: string | null;
};

export type MatrixRow = {
  classification: string;
  volume2026: number;
  share: number;
  cells: Record<string, MatrixCell | null>;
};

export type StatusMatrixData = {
  suppliers: string[];
  rows: MatrixRow[];
  technical_alternative_pct: number;
  released_alternative_pct: number;
  total_volume: number;
};

export type StatusMatrixResponse = {
  success: boolean;
  data?: StatusMatrixData;
  error?: string;
};

export type MsGroupItem = {
  ms_number: string;
  alternatives: number;
  best_availability: string;
  best_availability_rank: number;
  best_availability_color: string;
  total_volume: number;
};

export type ResultsData = {
  ms_groups: MsGroupItem[];
};

export type ResultsResponse = {
  success: boolean;
  data?: ResultsData;
  error?: string;
};

// ========== API METHODS ==========

export const exploreApi = {
  /**
   * Récupère la liste des classifications (material groups)
   * GET /api/explore/classifications/
   */
  getClassifications: async (): Promise<ClassificationsResponse> => {
    try {
      const response = await api.get('/explore/classifications/');
      return response.data;
    } catch (error: any) {
      console.error('❌ [Explore API] Classifications erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch classifications',
      };
    }
  },

  /**
   * Récupère les KPIs de couverture multisourcing
   * GET /api/explore/status/coverage/
   */
  getCoverageKpis: async (
    customer: string, 
    region: string, 
    materialGroup?: string
  ): Promise<CoverageKpisResponse> => {
    try {
      const params = new URLSearchParams();
      params.append('customer', customer);
      params.append('region', region);
      if (materialGroup) {
        params.append('material_group', materialGroup);
      }
      
      const response = await api.get(`/explore/status/coverage/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Explore API] Coverage KPIs erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch coverage KPIs',
      };
    }
  },

  /**
   * Récupère les données de part de marché
   * GET /api/explore/status/market-share/
   */
  getMarketShare: async (
    customer: string,
    region: string,
    materialGroup?: string
  ): Promise<MarketShareResponse> => {
    try {
      const params = new URLSearchParams();
      params.append('customer', customer);
      params.append('region', region);
      if (materialGroup) {
        params.append('material_group', materialGroup);
      }

      const response = await api.get(`/explore/status/market-share/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Explore API] Market Share erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch market share data',
      };
    }
  },

  /**
   * Récupère la matrice de statut des alternatives
   * GET /api/explore/status/matrix/
   */
  getStatusMatrix: async (
    customer: string,
    region: string,
    materialGroup?: string
  ): Promise<StatusMatrixResponse> => {
    try {
      const params = new URLSearchParams();
      params.append('customer', customer);
      params.append('region', region);
      if (materialGroup) {
        params.append('material_group', materialGroup);
      }

      const response = await api.get(`/explore/status/matrix/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Explore API] Status Matrix erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch status matrix',
      };
    }
  },

  /**
   * Récupère les résultats MS Groups
   * GET /api/explore/status/results/
   */
  getResults: async (
    customer: string,
    region: string,
    materialGroup?: string
  ): Promise<ResultsResponse> => {
    try {
      const params = new URLSearchParams();
      params.append('customer', customer);
      params.append('region', region);
      if (materialGroup) {
        params.append('material_group', materialGroup);
      }

      const response = await api.get(`/explore/status/results/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Explore API] Results erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch results',
      };
    }
  },
  
};

export default api;