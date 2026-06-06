import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Use EXPO_PUBLIC_API_URL environment variable in production.
// For local development fallback: use 10.0.2.2 for Android emulator, localhost for iOS/Web, or computer's local IP.
const getHost = () => {
  if (Platform.OS === 'web') return 'localhost';
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) return ip;
  }
  return '192.168.135.152'; // Current computer local IP
};

const HOST = getHost(); 
const DEFAULT_URL = `http://${HOST}:8000/`;

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;
let activeBaseUrl = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
const API_URL = `${activeBaseUrl}api/`;

export const getMediaUrl = (path: string | null) => {
  if (!path) return "https://i.pravatar.cc/300";
  if (path.startsWith("http")) return path;
  // Ensure we don't double slash
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${activeBaseUrl}${cleanPath}`;
};

let unauthorizedCallback: (() => void) | null = null;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (unauthorizedCallback) {
        unauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

const CANDIDATES = [
  process.env.EXPO_PUBLIC_API_URL,
  `http://localhost:8000/`,
  `http://10.0.2.2:8000/`,
  Constants.expoConfig?.hostUri ? `http://${Constants.expoConfig.hostUri.split(':')[0]}:8000/` : null,
  `http://192.168.135.152:8000/`,
].filter((url): url is string => !!url);

const pingUrl = async (url: string): Promise<boolean> => {
  const cleanUrl = url.endsWith('/') ? url : `${url}/`;
  const target = `${cleanUrl}api/`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout
    const response = await fetch(target, { 
      method: 'GET', 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);
    return response.ok || response.status === 200 || response.status === 401 || response.status === 403;
  } catch (err) {
    return false;
  }
};

export const resolveBackendUrl = async () => {
  for (const candidate of CANDIDATES) {
    const ok = await pingUrl(candidate);
    if (ok) {
      const cleanBase = candidate.endsWith('/') ? candidate : `${candidate}/`;
      activeBaseUrl = cleanBase;
      apiClient.defaults.baseURL = `${cleanBase}api/`;
      console.log(`[API] Dynamic backend URL resolved to: ${apiClient.defaults.baseURL}`);
      return candidate;
    }
  }
  console.warn(`[API] No dynamic backend candidate responded. Retaining base: ${apiClient.defaults.baseURL}`);
  return null;
};

// Start the resolution immediately on file import
resolveBackendUrl().catch(err => console.error("[API] Failed resolving backend:", err));

export const apiService = {
  // Auth
  login: (credentials: any) => apiClient.post('token-auth/', credentials),
  signup: (data: any) => apiClient.post('register/', data),
  getMe: () => apiClient.get('me/'),
  updateMe: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.patch('me/', data, {
      headers: {
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      },
    });
  },

  // Social / Phone auth
  loginWithGoogle: (data: { id_token: string; email?: string; name?: string }) =>
    apiClient.post('auth/google/', data),
  loginWithApple: (data: { identity_token: string; email?: string; name?: string }) =>
    apiClient.post('auth/apple/', data),
  sendPhoneOTP: (data: { phone: string }) =>
    apiClient.post('auth/phone/send-otp/', data),
  verifyPhoneOTP: (data: { phone: string; otp: string }) =>
    apiClient.post('auth/phone/verify/', data),
  sendEmailCode: (data: { email: string }) =>
    apiClient.post('auth/email/send-code/', data),
  verifyEmailCode: (data: { email: string; code: string }) =>
    apiClient.post('auth/email/verify/', data),

  // Password Reset
  sendPasswordResetCode: (data: { email: string }) =>
    apiClient.post('auth/password-reset/send-code/', data),
  verifyPasswordResetCode: (data: { email: string; code: string }) =>
    apiClient.post('auth/password-reset/verify/', data),
  confirmPasswordReset: (data: { email: string; code: string; new_password: string }) =>
    apiClient.post('auth/password-reset/confirm/', data),

  setToken: (token: string | null) => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Token ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  },
  onUnauthorized: (callback: () => void) => {
    unauthorizedCallback = callback;
  },

  // CRUD endpoints
  getEmployees: () => apiClient.get('employees/'),
  getEmployee: (id: string) => apiClient.get(`employees/${id}/`),
  createEmployee: (data: any) => {
    // Check if data is FormData (for image upload)
    const isFormData = data instanceof FormData;
    return apiClient.post('employees/', data, {
      headers: {
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      },
    });
  },
  updateEmployee: (id: string, data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.put(`employees/${id}/`, data, {
      headers: {
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      },
    });
  },
  patchEmployee: (id: string, data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.patch(`employees/${id}/`, data, {
      headers: {
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      },
    });
  },
  deleteEmployee: (id: string) => apiClient.delete(`employees/${id}/`),
  
  flagEmployee: (id: string, data: { is_flagged: boolean; flag_reason?: string; flag_note?: string }) => 
    apiClient.post(`employees/${id}/flag/`, data),
  archiveEmployee: (id: string) => apiClient.post(`employees/${id}/archive/`),
  restoreEmployee: (id: string) => apiClient.post(`employees/${id}/restore/`),
  
  createTask: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.post('employee-tasks/', data, {
      headers: {
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      },
    });
  },
  createQuery: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.post('employee-queries/', data, {
      headers: {
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      },
    });
  },
  createLeave: (data: any) => apiClient.post('employee-leaves/', data),
  createMessage: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.post('employee-messages/', data, {
      headers: {
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      },
    });
  },
  createDocument: (data: any) => apiClient.post('employee-documents/', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteDocument: (docId: string) => apiClient.delete(`employee-documents/${docId}/`),
  createSalaryAdjustment: (data: any) => apiClient.post('salary-adjustments/', data),

  getClients: () => apiClient.get('clients/'),
  getClient: (id: string) => apiClient.get(`clients/${id}/`),
  createClient: (data: any) => apiClient.post('clients/', data),
  updateClient: (id: string, data: any) => apiClient.put(`clients/${id}/`, data),
  patchClient: (id: string, data: any) => apiClient.patch(`clients/${id}/`, data),
  deleteClient: (id: string) => apiClient.delete(`clients/${id}/`),

  getProjects: () => apiClient.get('projects/'),
  createProject: (data: any) => apiClient.post('projects/', data),
  updateProject: (id: string, data: any) => apiClient.put(`projects/${id}/`, data),
  patchProject: (id: string, data: any) => apiClient.patch(`projects/${id}/`, data),
  deleteProject: (id: string) => apiClient.delete(`projects/${id}/`),
  getTransactions: () => apiClient.get('transactions/'),
  createTransaction: (data: any) => apiClient.post('transactions/', data),
  getNotifications: () => apiClient.get('notifications/'),
  getBudgets: () => apiClient.get('budgets/'),
  getSavings: () => apiClient.get('savings/'),
  getDebts: () => apiClient.get('debts/'),

  // Aggregated endpoints
  getMetrics: () => apiClient.get('metrics/'),
  getClientMetrics: () => apiClient.get('client-metrics/'),
  getPayrollMetrics: () => apiClient.get('payroll-metrics/'),
  togglePayrollMonth: (data: { month: string; paid: boolean }) => apiClient.post('payroll-metrics/toggle/', data),
  getDebtsGrouped: () => apiClient.get('debts-grouped/'),
  deleteAccount: () => apiClient.delete('me/'),
  
  // Employee Portal Endpoints
  getEmployeeDashboard: () => apiClient.get('employee-portal/dashboard/'),
  getEmployeeFinance: () => apiClient.get('employee-portal/finance/'),
  updateEmployeeTask: (taskId: number, data: { status: string; description?: string }) => 
    apiClient.post(`employee-portal/tasks/${taskId}/update/`, data),
};

export default apiClient;
