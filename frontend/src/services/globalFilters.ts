// src/services/globalFilters.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export type SnapshotOption = {
  id: number | null;
  name: string;
  is_latest: boolean;
};

export type GlobalFiltersData = {
  customers: string[];
  regions: string[];
  snapshots: SnapshotOption[];
};

export type GlobalFiltersResponse = {
  success: boolean;
  data?: GlobalFiltersData;
  error?: string;
};

// Cache local
let cachedFilters: GlobalFiltersData | null = null;

export const globalFiltersApi = {
  /**
   * Récupère les options pour les filtres globaux
   * GET /api/explore/filters/
   * Utilise un cache pour éviter les appels répétés
   */
  getFilters: async (useCache = true): Promise<GlobalFiltersResponse> => {
    // Retourner le cache si disponible
    if (useCache && cachedFilters) {
      return { success: true, data: cachedFilters };
    }

    try {
      const response = await api.get('/explore/filters/');
      
      if (response.data.success) {
        // Mettre en cache
        cachedFilters = response.data.data;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [GlobalFilters API] Erreur:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch filters',
      };
    }
  },

  /**
   * Vide le cache pour forcer un rechargement
   */
  clearCache: () => {
    cachedFilters = null;
  },
};

export default api;