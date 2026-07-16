// src/services/alternativeApi.ts
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
    console.log(`📤 [Alternative API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour logger les réponses
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [Alternative API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ [Alternative API Error] ${error.response?.status || 'Network'} ${error.config?.url}`);
    return Promise.reject(error);
  }
);

// ========== TYPES ==========

export type OEMDetail = {
  oem: string;
  status: string;
};

export type OEMSummary = {
  total: number;
  released: number;
  percentage: number;
  details: OEMDetail[];
};

export type PriceRange = {
  min: number;
  max: number;
};

export type AlternativePart = {
  leoni_part_number: string;
  supplier_group: string;
  supplier_part_number: string | null;
  fors_material_group: string | null;
  compatibility_status: string | null;
  multisourcing_status: string | null;
  multisourcing_status_parsed: string | null;
  multisourcing_number: string | null;
  s4_description: string | null;
  annual_volume: number;
  unit_price: number | null;
  full_price: number | null;
  currency: string | null;
  price_range: PriceRange;
  oem_summary: OEMSummary;
};

export type VolumeShare = {
  supplier: string;
  volume: number;
  percentage: number;
};

export type VolumeRegion = {
  region: string;
  volume: number;
};

export type PartAlternativeData = {
  ms_number: string;
  total_volume: number;
  current_part: AlternativePart | null;
  alternatives: AlternativePart[];
  volume_share: VolumeShare[];
  volume_by_region: VolumeRegion[];
};

export type PartAlternativeResponse = {
  success: boolean;
  data?: PartAlternativeData;
  error?: string;
};

// ========== API METHODS ==========

export const alternativeApi = {
  /**
   * Récupère les alternatives d'un MS group
   * GET /api/alternative/ms/{ms_number}/
   */
  getAlternatives: async (
    msNumber: string,
    region?: string,
    currentPart?: string
  ): Promise<PartAlternativeResponse> => {
    try {
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      if (currentPart) params.append('current_part', currentPart);

      const response = await api.get(`/alternative/ms/${encodeURIComponent(msNumber)}/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Alternative API] Erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch alternatives',
      };
    }
  },
};

export default api;