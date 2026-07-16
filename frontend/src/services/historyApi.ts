// src/services/historyApi.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    console.log(`📤 [History API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    console.log(`📥 [History API] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ [History API Error] ${error.response?.status || 'Network'} ${error.config?.url}`);
    return Promise.reject(error);
  }
);

// ========== TYPES ==========

export type ImportRun = {
  id: number;
  batch_name: string;
  import_date: string;
  completed_at: string | null;
  status: string;
  error_details: string | null;
  files: {
    tech_data: string | null;
    transport: string | null;
    project: string | null;
    prices: string | null;
  };
  cleaning_stats: {
    rows_read: number;
    rows_after_clean: number;
    duplicates_removed: number;
    total_null_count: number;
  };
  import_stats: {
    imported_rows: number;
    warning_count: number;
    error_count: number;
  };
  duration_seconds: number | null;
};

export type BusinessCaseHistory = {
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

export type ActivityItem = {
  id: string;
  type: 'import' | 'scenario' | 'task';
  title: string;
  subtitle: string;
  createdAt: string;
  runId?: string;
  msNumber?: string;
};

// ========== API METHODS ==========

export const historyApi = {
  /**
   * Récupère la liste des imports
   * GET /api/history/imports/
   */
  getImports: async (): Promise<ImportRun[]> => {
    const response = await api.get('/history/imports/');
    return response.data.data || [];
  },

  /**
   * Récupère les détails d'un import
   * GET /api/history/imports/{id}/
   */
  getImportDetail: async (id: number): Promise<ImportRun | null> => {
    const response = await api.get(`/history/imports/${id}/`);
    return response.data.data || null;
  },

  /**
   * Récupère la liste des business cases sauvegardés
   * GET /api/history/business-cases/
   */
  getBusinessCases: async (): Promise<BusinessCaseHistory[]> => {
    const response = await api.get('/history/business-cases/');
    return response.data.data || [];
  },

  /**
   * Récupère l'activité récente (mix imports + business cases)
   */
  getActivity: async (): Promise<ActivityItem[]> => {
    const [imports, bcs] = await Promise.all([
      historyApi.getImports(),
      historyApi.getBusinessCases(),
    ]);

    const activities: ActivityItem[] = [];

    imports.forEach(imp => {
      activities.push({
        id: `import-${imp.id}`,
        type: 'import',
        title: `Import ${imp.batch_name}`,
        subtitle: `Status: ${imp.status}, Rows: ${imp.import_stats?.imported_rows || 0}`,
        createdAt: imp.import_date,
        runId: String(imp.id),
      });
    });

    bcs.forEach(bc => {
      activities.push({
        id: `scenario-${bc.id}`,
        type: 'scenario',
        title: `Business Case ${bc.ms_number}`,
        subtitle: `Type: ${bc.scenario_type}, Region: ${bc.purchase_region}/${bc.usage_market}`,
        createdAt: bc.created_at,
        msNumber: bc.ms_number,
      });
    });

    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return activities.slice(0, 50);
  },
};

export default api;