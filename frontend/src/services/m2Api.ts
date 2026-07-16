// src/services/m2Api.ts
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
    console.log(`📤 [M2 API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour logger les réponses
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [M2 API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ [M2 API Error] ${error.response?.status || 'Network'} ${error.config?.url}`);
    return Promise.reject(error);
  }
);

// ========== TYPES ==========

export type M2RegionalData = {
  region: string;
  unit_price: number | null;
  full_price: number | null;
  currency: string | null;
  volume: number;
  value: number;
  price_source_server: string | null;
};

export type M2PriceRange = {
  min: number;
  max: number;
};

export type M2SignalItem = {
  region?: string;
  value?: number;
  percentage?: number;
  unit_price?: number;
  name?: string;
  volume?: number;
};

export type M2Signals = {
  top_value_region: M2SignalItem | null;
  highest_unit_price_region: M2SignalItem | null;
  dominant_plant: M2SignalItem | null;
  dominant_project: M2SignalItem | null;
};

export type M2BreakdownItem = {
  name: string;
  volume: number;
  percentage: number;
  value: number;
};

export type M2Breakdowns = {
  project_breakdown: M2BreakdownItem[];
  account_breakdown: M2BreakdownItem[];
  plant_breakdown: M2BreakdownItem[];
};

export type M2PartInfo = {
  leoni_part_number: string;
  supplier_part_number: string | null;
  supplier_group: string | null;
  fors_material_group: string | null;
  fors_classification: string | null;
  s4_description: string | null;
};

export type M2PartData = {
  part_info: M2PartInfo;
  price_range: M2PriceRange;
  active_regions: number;
  regional_data: M2RegionalData[];
  total_volume: number;
  total_value: number;
  signals: M2Signals;
  breakdowns: M2Breakdowns;
};

export type M2PartResponse = {
  success: boolean;
  data?: M2PartData;
  error?: string;
};

// Type pour le batch
export type M2BatchPartData = {
  input: string;
  match_type: string | null;
  error?: string;
  leoni_part_number?: string;
  supplier_part_number?: string | null;
  supplier_group?: string | null;
  fors_material_group?: string | null;
  fors_classification?: string | null;
  s4_description?: string | null;
  total_volume?: number;
  total_value?: number;
  active_regions?: number;
  price_range?: M2PriceRange;
  regional_data?: M2RegionalData[];
  project_breakdown?: M2BreakdownItem[];
  account_breakdown?: M2BreakdownItem[];
  plant_breakdown?: M2BreakdownItem[];
};

export type M2PartsBatchResponse = {
  success: boolean;
  data?: M2BatchPartData[];
  count?: number;
  error?: string;
};

export type M2MaterialGroupPartData = {
  leoni_part_number: string;
  supplier_part_number: string | null;
  supplier_group: string | null;
  fors_classification: string | null;
  s4_description: string | null;
  total_volume: number;
  total_value: number;
  active_regions: number;
  price_range: M2PriceRange;
  regional_data: M2RegionalData[];
  project_breakdown: M2BreakdownItem[];
  account_breakdown: M2BreakdownItem[];
  plant_breakdown: M2BreakdownItem[];
};

export type M2RankingItem = {
  name: string;
  value: number;
  volume: number;
  percentage: number;
};

export type M2MaterialGroupData = {
  material_group: string;
  total_volume: number;
  total_value: number;
  parts_count: number;
  suppliers_count: number;
  price_range: M2PriceRange;
  top_part_share: {
    leoni_part_number: string;
    percentage: number;
  };
  three_region_coverage: number;
  supplier_split: M2RankingItem[];
  region_split: M2RankingItem[];
  project_ranking: M2RankingItem[];
  account_ranking: M2RankingItem[];
  plant_ranking: M2RankingItem[];
  classification_split: M2RankingItem[];
  parts: M2MaterialGroupPartData[];
};

export type M2MaterialGroupResponse = {
  success: boolean;
  data?: M2MaterialGroupData;
  error?: string;
};

export type M2SupplierPartData = {
  leoni_part_number: string;
  supplier_part_number: string | null;
  supplier_group: string | null;
  fors_material_group: string | null;
  fors_classification: string | null;
  s4_description: string | null;
  total_volume: number;
  total_value: number;
  active_regions: number;
  price_range: M2PriceRange;
  regional_data: M2RegionalData[];
  project_breakdown: M2BreakdownItem[];
  account_breakdown: M2BreakdownItem[];
  plant_breakdown: M2BreakdownItem[];
};

export type M2SupplierData = {
  supplier: string;
  total_volume: number;
  total_value: number;
  parts_count: number;
  material_groups_count: number;
  price_range: M2PriceRange;
  top_part_share: {
    leoni_part_number: string;
    percentage: number;
  };
  three_region_coverage: number;
  region_split: M2RankingItem[];
  material_group_split: M2RankingItem[];
  part_ranking: M2RankingItem[];
  project_ranking: M2RankingItem[];
  account_ranking: M2RankingItem[];
  plant_ranking: M2RankingItem[];
  parts: M2SupplierPartData[];
};

export type M2SupplierResponse = {
  success: boolean;
  data?: M2SupplierData;
  error?: string;
};

// ========== API METHODS ==========

export const m2Api = {
  /**
   * Récupère les données commerciales d'un composant
   * GET /api/m2/part/{leoni_part_number}/
   */
  getPartCommercial: async (leoniPartNumber: string): Promise<M2PartResponse> => {
    try {
      const response = await api.get(`/m2/part/${encodeURIComponent(leoniPartNumber)}/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [M2 API] Erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch commercial data',
      };
    }
  },

  /**
   * Récupère les données commerciales pour plusieurs composants en batch
   * POST /api/m2/parts/
   */
  getPartsBatch: async (inputs: string[]): Promise<M2PartsBatchResponse> => {
    try {
      const response = await api.post('/m2/parts/', { inputs });
      return response.data;
    } catch (error: any) {
      console.error('❌ [M2 API Batch] Erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch batch commercial data',
      };
    }
  },

  /**
   * Récupère les données commerciales d'un groupe de matériaux
   * GET /api/m2/material-group/{material_group}/
   */
  getMaterialGroup: async (materialGroup: string): Promise<M2MaterialGroupResponse> => {
    try {
      const response = await api.get(`/m2/material-group/${encodeURIComponent(materialGroup)}/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [M2 API] Material Group Erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch material group data',
      };
    }
  },

  /**
   * Récupère les données commerciales d'un fournisseur
   * GET /api/m2/supplier/{supplier_name}/
   */
  getSupplier: async (supplierName: string): Promise<M2SupplierResponse> => {
    try {
      const response = await api.get(`/m2/supplier/${encodeURIComponent(supplierName)}/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [M2 API] Supplier Erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch supplier data',
      };
    }
  },
};

export default api;