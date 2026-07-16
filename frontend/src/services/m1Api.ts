// src/services/m1Api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========== TYPES ==========

export type M1PartData = {
  leoni_part_number: string;
  supplier_part_number: string | null;
  supplier_group: string | null;
  fors_material_group: string | null;
  s4_description: string | null;
  fors_classification: string | null;
  oem_applicability: string[];
  oem_count: number;
};

export type M1ProjectUsage = {
  project_name: string;
  volume: number;
  percentage: number;
};

export type M1AccountUsage = {
  oem_brand: string;
  total_volume: number;
  percentage: number;
  projects: M1ProjectUsage[];
};

export type M1PartUsageData = {
  usage_by_account: M1AccountUsage[];
};

export type M1TransportVolume = {
  name: string;
  volume: number;
};

export type M1PartTransportData = {
  total_annual_volume: number;
  plants: string[];
  volume_by_region: M1TransportVolume[];
  volume_by_plant: M1TransportVolume[];
  volume_by_country: M1TransportVolume[];
};

// Type pour la réponse batch (plusieurs composants)
export type M1PartBatchItem = {
  input: string;
  match_type: 'LEONI PN' | 'Supplier PN' | null;
  leoni_part_number: string;
  supplier_part_number: string | null;
  supplier_group: string | null;
  fors_material_group: string | null;
  s4_description: string | null;
  fors_classification: string | null;
  oem_applicability: string[];
  oem_count: number;
  annual_volume_context: number;
  plants: string[];
  volume_by_region: M1TransportVolume[];
  volume_by_country: M1TransportVolume[];
  usage_by_account: M1AccountUsage[];
  error?: string;
};

export type M1PartsBatchResponse = {
  success: boolean;
  data?: M1PartBatchItem[];
  count?: number;
  error?: string;
};

export type M1PartResponse = {
  success: boolean;
  data?: M1PartData;
  error?: string;
};

export type M1PartUsageResponse = {
  success: boolean;
  data?: M1PartUsageData;
  error?: string;
};

export type M1PartTransportResponse = {
  success: boolean;
  data?: M1PartTransportData;
  error?: string;
};

export type M1MaterialGroupPart = {
  leoni_part_number: string;
  supplier_part_number: string | null;
  supplier_group: string | null;
  fors_classification: string | null;
  s4_description: string | null;
  annual_volume_context: number;
  oem_applicability: string[];
  plants: string[];
  volume_by_region: M1TransportVolume[];
  volume_by_country: M1TransportVolume[];
  usage_by_account: M1AccountUsage[];
};

export type M1MaterialGroupResponse = {
  success: boolean;
  data?: {
    material_group: string;
    total_annual_volume: number;
    parts: M1MaterialGroupPart[];
  };
  error?: string;
};

// ========== API METHODS ==========

export const m1Api = {
  /**
   * Récupère les informations d'identification d'un composant
   */
  getPartById: async (leoniPartNumber: string): Promise<M1PartResponse> => {
    try {
      const response = await api.get(`/m1/part/${encodeURIComponent(leoniPartNumber)}/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [M1 API] Erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch part',
      };
    }
  },

  /**
   * Récupère les données d'utilisation (projets/clients) d'un composant
   */
  getPartUsage: async (leoniPartNumber: string): Promise<M1PartUsageResponse> => {
    try {
      const response = await api.get(`/m1/part/${encodeURIComponent(leoniPartNumber)}/usage/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [M1 API] Erreur usage:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch part usage',
      };
    }
  },

  /**
   * Récupère les données de transport d'un composant
   */
  getPartTransport: async (leoniPartNumber: string): Promise<M1PartTransportResponse> => {
    try {
      const response = await api.get(`/m1/part/${encodeURIComponent(leoniPartNumber)}/transport/`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [M1 API] Erreur transport:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch transport data',
      };
    }
  },

  /**
   * Récupère les informations pour plusieurs composants en batch
   */
  getPartsBatch: async (inputs: string[]): Promise<M1PartsBatchResponse> => {
    try {
      const response = await api.post('/m1/parts/', { inputs });
      return response.data;
    } catch (error: any) {
      console.error('❌ [M1 API] Erreur batch:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch parts batch',
      };
    }
  },

  getMaterialGroup: async (materialGroup: string): Promise<M1MaterialGroupResponse> => {
  try {
    const response = await api.get(`/m1/material-group/${encodeURIComponent(materialGroup)}/`);
    return response.data;
  } catch (error: any) {
    console.error('❌ [M1 API] Erreur material group:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch material group',
    };
  }
},
};

export default api;