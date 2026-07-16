// src/services/importApi.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/upload';

// Création d'une instance axios avec configuration de base
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Intercepteur pour logger les requêtes
api.interceptors.request.use(
  (config) => {
    console.log(`📤 [API Request] ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data instanceof FormData) {
      console.log('📦 [FormData] Contenu:');
      for (let pair of (config.data as FormData).entries()) {
        if (pair[1] instanceof File) {
          console.log(`   - ${pair[0]}: ${pair[1].name} (${pair[1].size} bytes, ${pair[1].type})`);
        } else {
          console.log(`   - ${pair[0]}: ${pair[1]}`);
        }
      }
    } else if (config.data && typeof config.data === 'object') {
      console.log('📦 [JSON] Contenu:', config.data);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour logger les réponses
api.interceptors.response.use(
  (response) => {
    console.log(`📥 [API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ [API Error] ${error.response?.status || 'Network'} ${error.config?.url}`);
    console.error('   Erreur:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Types pour les réponses API
export type CleaningSummary = {
  rows_read: number;
  rows_after_clean: number;
  duplicates_removed: number;
  total_null_count: number;
};

export type CleaningPhase = "Queued" | "Cleaning" | "Completed" | "Failed" | "Cancelled";

export type CleaningStatusResponse = {
  status: CleaningPhase;
  progress: number;
  message?: string;
  error?: string;
  stats?: CleaningSummary;
  cleaned_files?: CleanedFiles;
  batch_name?: string;
  current_file?: string;
};

export type ImportPhase = "Queued" | "Parsing" | "Validating" | "Importing" | "Done" | "Failed";

export type ImportStatusResponse = {
  status: ImportPhase;
  progress: number;
  total_rows?: number;
  processed_rows?: number;
  errors?: number;
  warnings?: number;
  message?: string;
  error?: string;
};

export type CleanedFiles = {
  tech_data?: string;
  transport?: string;
  project?: string;
  prices?: string;
};

export type CleanStartResponse = {
  success: boolean;
  task_id: string;
  message: string;
};

export type StartImportResponse = {
  task_id: string;
};

export type CancelResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

// ========== API IMPORT (ASYNC) ==========

export const importApi = {
  /**
   * Démarre le nettoyage asynchrone des fichiers Excel
   */
  startCleaning: async (
    files: {
      file_tech: File | null;
      file_transport: File | null;
      file_project: File | null;
      file_prices: File | null;
    },
    batchName: string
  ): Promise<CleanStartResponse> => {
    try {
      const formData = new FormData();
      
      console.log('🚀 [Début nettoyage async] Préparation des blobs binaires...');
      
      if (files.file_tech) {
        console.log(`📁 [Blob] file_tech: ${files.file_tech.name} (${files.file_tech.size} bytes, type: ${files.file_tech.type})`);
        formData.append('file_tech', files.file_tech, files.file_tech.name);
      }
      
      if (files.file_transport) {
        console.log(`📁 [Blob] file_transport: ${files.file_transport.name} (${files.file_transport.size} bytes, type: ${files.file_transport.type})`);
        formData.append('file_transport', files.file_transport, files.file_transport.name);
      }
      
      if (files.file_project) {
        console.log(`📁 [Blob] file_project: ${files.file_project.name} (${files.file_project.size} bytes, type: ${files.file_project.type})`);
        formData.append('file_project', files.file_project, files.file_project.name);
      }
      
      if (files.file_prices) {
        console.log(`📁 [Blob] file_prices: ${files.file_prices.name} (${files.file_prices.size} bytes, type: ${files.file_prices.type})`);
        formData.append('file_prices', files.file_prices, files.file_prices.name);
      }
      
      formData.append('batch_name', batchName);
      
      console.log('📡 [Envoi] Requête POST vers /api/upload/clean/start/');
      console.time('⏱️ Temps d\'envoi');
      
      const response = await api.post('/clean/start/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📊 [Progression envoi] ${percentCompleted}% (${progressEvent.loaded} / ${progressEvent.total} bytes)`);
          }
        },
      });
      
      console.timeEnd('⏱️ Temps d\'envoi');
      console.log('✅ [Succès] Nettoyage démarré, task_id:', response.data.task_id);
      
      return response.data;
    } catch (error: any) {
      console.timeEnd('⏱️ Temps d\'envoi');
      console.error('❌ [Erreur] Démarrage nettoyage échoué:', error);
      return {
        success: false,
        task_id: '',
        message: error.response?.data?.error || error.message || 'Cleaning start failed',
      };
    }
  },

  /**
   * Vérifie le statut du nettoyage asynchrone
   */
  getCleaningStatus: async (taskId: string): Promise<CleaningStatusResponse> => {
    console.log(`🔄 [Polling Nettoyage] Vérification statut task ${taskId}...`);
    const response = await api.get(`/clean/status/${taskId}/`);
    console.log(`📊 [Statut Nettoyage] ${response.data.status} - Progression: ${response.data.progress}%`);
    return response.data;
  },

  /**
   * Annule un nettoyage en cours
   */
  cancelCleaning: async (taskId: string): Promise<CancelResponse> => {
    console.log(`❌ [Annulation] Annulation du nettoyage task ${taskId}...`);
    try {
      const response = await api.post(`/clean/cancel/${taskId}/`);
      console.log(`✅ [Annulation] Succès:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [Annulation] Échec:`, error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Cancellation failed'
      };
    }
  },

  /**
   * Démarre l'import asynchrone
   */
  startImport: async (
    cleanedFiles: CleanedFiles, 
    batchName: string,
    cleaningStats?: CleaningSummary
  ): Promise<StartImportResponse> => {
    console.log('🚀 [Démarrage import] Envoi de la requête...');
    console.log('📁 [Cleaned files]', cleanedFiles);
    console.log('🏷️ [Batch name]', batchName);
    console.log('📊 [Cleaning stats]', cleaningStats);
    
    const response = await api.post('/import/start/', {
      cleaned_files: cleanedFiles,
      batch_name: batchName,
      cleaning_stats: cleaningStats,  // ← Ajout des statistiques de nettoyage
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`✅ [Import démarré] Task ID: ${response.data.task_id}`);
    return response.data;
  },

  /**
   * Vérifie le statut d'un import
   */
  getImportStatus: async (taskId: string): Promise<ImportStatusResponse> => {
    console.log(`🔄 [Polling Import] Vérification statut task ${taskId}...`);
    const response = await api.get(`/import/status/${taskId}/`);
    console.log(`📊 [Statut Import] ${response.data.status} - Progression: ${response.data.progress}%`);
    return response.data;
  },
};

export default api;