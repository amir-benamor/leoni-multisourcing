// src/services/businessCaseApi.ts
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
    console.log(`📤 [BusinessCase API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour logger les réponses
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [BusinessCase API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ [BusinessCase API Error] ${error.response?.status || 'Network'} ${error.config?.url}`);
    return Promise.reject(error);
  }
);

// ========== TYPES ==========

export type BcPart = {
  leoni_part_number: string;
  supplier_group: string;
  supplier_part_number: string | null;
  fors_material_group: string | null;
  compatibility_status: string | null;
  multisourcing_status: string | null;
  multisourcing_number: string | null;
  s4_description: string | null;
  usage_volume: number;
  total_volume: number;
  unit_price: number | null;
  full_price: number | null;
  currency: string | null;
  oem_total: number;
  oem_released: number;
  oem_not_released: number;
};

export type MarketShareItem = {
  supplier: string;
  volume: number;
  percentage: number;
};

export type BcLoadData = {
  ms_number: string;
  parts: BcPart[];
  total_volume: number;
  suppliers: string[];
  market_share: MarketShareItem[];
};

export type BcLoadResponse = {
  success: boolean;
  data?: BcLoadData;
  error?: string;
};

// ========== RECOMMEND ==========

export type RecommendScenario = {
  type: 'selective' | 'full';
  current_part: string | null;
  current_supplier: string | null;
  target_part: string;
  target_supplier: string;
  full_switch: boolean;
  score: number;
  annual_saving: number;
  total_volume: number;
  release_risk: number;
  supplier_concentration_risk: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  reasons?: string[];
};

export type RecommendData = {
  ms_number: string;
  purchase_region: string;
  usage_market: string;
  total_scenarios_tested: number;
  best_scenario: RecommendScenario | null;
  top_scenarios: RecommendScenario[];
};

export type RecommendResponse = {
  success: boolean;
  data?: RecommendData;
  error?: string;
};

// ========== SAVE ==========

export type BcTaskSave = {
  title: string;
  note?: string;
  due_date?: string | null;
  status?: string;
  owner?: string;
};

export type BcSavePayload = {
  ms_number: string;
  current_part?: string;
  target_part?: string;
  scenario_type: 'selective' | 'full';
  full_switch: boolean;
  purchase_region: string;
  usage_market: string;
  notes_json?: Record<string, string>;
  tasks?: BcTaskSave[];
};

export type BcSaveResponse = {
  success: boolean;
  data?: {
    id: number;
    message: string;
  };
  error?: string;
};

// ========== DETAIL ==========

export type BcDetailTask = {
  id: number;
  title: string;
  note: string;
  due_date: string | null;
  status: string;
  owner: string;
};

export type BcDetailData = {
  id: number;
  ms_number: string;
  scenario_type: string;
  full_switch: boolean;
  purchase_region: string;
  usage_market: string;
  current_part: string | null;
  target_part: string | null;
  notes_json: Record<string, string> | null;
  tasks: BcDetailTask[];
  created_at: string;
};

export type BcDetailResponse = {
  success: boolean;
  data?: BcDetailData;
  error?: string;
};

// ========== HISTORY ==========

export type BcHistoryItem = {
  id: number;
  ms_number: string;
  scenario_type: string;
  full_switch: boolean;
  current_part: string | null;
  target_part: string | null;
  purchase_region: string;
  usage_market: string;
  created_at: string;
};

export type BcHistoryResponse = {
  success: boolean;
  data?: BcHistoryItem[];
  error?: string;
};

// ========== API METHODS ==========

export const businessCaseApi = {
  /**
   * Charge les données d'un MS group pour le business case
   * GET /api/business-case/ms/{ms_number}/
   */
  loadMsGroup: async (
    msNumber: string,
    purchaseRegion?: string,
    usageMarket?: string
  ): Promise<BcLoadResponse> => {
    try {
      const params = new URLSearchParams();
      if (purchaseRegion) params.append('purchase_region', purchaseRegion);
      if (usageMarket) params.append('usage_market', usageMarket);

      const response = await api.get(
        `/business-case/ms/${encodeURIComponent(msNumber)}/?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('❌ [BusinessCase API] Load erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to load MS group',
      };
    }
  },

  /**
   * Recommande le meilleur scénario
   * GET /api/business-case/recommend/{ms_number}/
   */
  recommend: async (
    msNumber: string,
    purchaseRegion?: string,
    usageMarket?: string
  ): Promise<RecommendResponse> => {
    try {
      const params = new URLSearchParams();
      if (purchaseRegion) params.append('purchase_region', purchaseRegion);
      if (usageMarket) params.append('usage_market', usageMarket);

      const response = await api.get(
        `/business-case/recommend/${encodeURIComponent(msNumber)}/?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('❌ [BusinessCase API] Recommend erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get recommendation',
      };
    }
  },

  /**
   * Sauvegarde un business case dans l'historique
   * POST /api/history/business-cases/save/
   */
  save: async (payload: BcSavePayload): Promise<BcSaveResponse> => {
    try {
      const response = await api.post('/history/business-cases/save/', payload);
      return response.data;
    } catch (error: any) {
      console.error('❌ [BusinessCase API] Save erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to save business case',
      };
    }
  },

  /**
   * Charge un business case sauvegardé depuis l'historique
   * GET /api/history/business-cases/{id}/
   */
  getDetail: async (id: number): Promise<BcDetailResponse> => {
    try {
      const response = await api.get(`/history/business-cases/${id}/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [BusinessCase API] Detail erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to load business case',
      };
    }
  },

  /**
   * Récupère l'historique des business cases
   * GET /api/history/business-cases/
   */
  getHistory: async (msNumber?: string): Promise<BcHistoryResponse> => {
    try {
      const params = new URLSearchParams();
      if (msNumber) params.append('ms_number', msNumber);

      const response = await api.get(`/history/business-cases/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [BusinessCase API] History erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to load history',
      };
    }
  },
};

export default api;