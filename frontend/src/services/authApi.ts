// src/services/authApi.ts

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/auth';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh: refreshToken });
        localStorage.setItem('access_token', response.data.access);
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  // ========== AUTHENTIFICATION ==========
  
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await api.post('/login/', { email: credentials.email, password: credentials.password });
      if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data || { message: 'Login failed' } };
    }
  },

  register: async (userData: any) => {
    try {
      const response = await api.post('/register/', {
        email: userData.workEmail,
        first_name: userData.firstName,
        last_name: userData.lastName,
        password: userData.password,
        confirm_password: userData.confirmPassword,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data || { message: 'Registration failed' } };
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try { await api.post('/logout/', { refresh: refreshToken }); } catch {}
    }
    localStorage.clear();
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token');
    try {
      const response = await api.post('/token/refresh/', { refresh: refreshToken });
      if (response.data.access) localStorage.setItem('access_token', response.data.access);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data || { message: 'Refresh failed' } };
    }
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => !!localStorage.getItem('access_token'),

  getToken: () => localStorage.getItem('access_token'),

  // ========== PROFIL & SETTINGS ==========

  getProfile: async () => {
    try {
      const response = await api.get('/info/');
      return response.data;
    } catch {
      return { user: null, preferences: null };
    }
  },

  updateProfile: async (data: { fullName?: string; department?: string; site?: string }) => {
    try {
      const payload: Record<string, string> = {};
      
      if (data.fullName !== undefined && data.fullName.trim()) {
        const parts = data.fullName.trim().split(/\s+/);
        payload.first_name = parts[0] || '';
        if (parts.length > 1) payload.last_name = parts.slice(1).join(' ');
      }
      if (data.department !== undefined && data.department !== '') {
        payload.department = data.department;
      }
      if (data.site !== undefined && data.site !== '') {
        payload.site = data.site;
      }

      if (Object.keys(payload).length === 0) {
        return { success: false, error: 'No data to update' };
      }
      
      const response = await api.put('/profile/update/', payload);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data };
    }
  },

  changePassword: async (data: { current_password: string; new_password: string; confirm_password: string }) => {
    try {
      const response = await api.post('/change-password/', data);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data };
    }
  },

  updatePreferences: async (data: { theme?: string; remember_last_scope?: boolean }) => {
    try {
      const response = await api.put('/preferences/update/', data);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data };
    }
  },

  // ========== ADMIN ==========
  
  getAdminStats: async () => {
    try {
      const response = await api.get('/admin/stats/');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data };
    }
  },

  getPendingUsers: async () => {
    try {
      const response = await api.get('/admin/pending-users/');
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data };
    }
  },

  getAdminUsers: async (params?: { search?: string; role?: string; is_approved?: boolean; is_active?: boolean }) => {
    try {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.role) query.append('role', params.role);
      if (params?.is_approved !== undefined) query.append('is_approved', String(params.is_approved));
      if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
      const url = `/admin/users/${query.toString() ? `?${query}` : ''}`;
      const response = await api.get(url);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data };
    }
  },

  approveUser: async (userId: number, role: string, adminNote?: string) => {
    try {
      const response = await api.post(`/admin/users/${userId}/approve/`, { role, admin_note: adminNote || '' });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data || { message: 'Approval failed' } };
    }
  },

  rejectUser: async (userId: number, rejectionReason: string) => {
    try {
      const response = await api.delete(`/admin/users/${userId}/reject/`, { data: { rejection_reason: rejectionReason } });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data || { message: 'Rejection failed' } };
    }
  },

  updateUserRole: async (userId: number, role: string) => {
    try {
      const response = await api.patch(`/admin/users/${userId}/role/`, { role });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data };
    }
  },

  toggleUserActive: async (userId: number) => {
    try {
      const response = await api.patch(`/admin/users/${userId}/toggle-active/`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data };
    }
  },

  deleteUser: async (userId: number) => {
    try {
      const response = await api.delete(`/admin/users/${userId}/`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data };
    }
  },

  // ========== AUDIT LOGS ==========

  getAuditLogs: async (params?: { category?: string; severity?: string; timeRange?: string }) => {
    try {
      const query = new URLSearchParams();
      if (params?.category && params.category !== 'all') query.append('category', params.category);
      if (params?.severity) query.append('severity', params.severity);
      if (params?.timeRange) query.append('time_range', params.timeRange);
      const url = `/admin/audit-logs/${query.toString() ? `?${query}` : ''}`;
      const response = await api.get(url);
      return { success: true, data: response.data.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data || { message: 'Failed to load audit logs' } };
    }
  },
};

export default api;