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
  return '192.168.148.152'; // Current computer local IP
};

const HOST = getHost(); 
const DEFAULT_URL = `http://${HOST}:8000/`;

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;
const cleanBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
const API_URL = `${cleanBase}api/`;

export const getMediaUrl = (path: string | null) => {
  if (!path) return "https://i.pravatar.cc/300";
  if (path.startsWith("http")) return path;
  // Ensure we don't double slash
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
};

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  setToken: (token: string | null) => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Token ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
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
  deleteEmployee: (id: string) => apiClient.delete(`employees/${id}/`),

  getClients: () => apiClient.get('clients/'),
  getClient: (id: string) => apiClient.get(`clients/${id}/`),
  createClient: (data: any) => apiClient.post('clients/', data),

  getProjects: () => apiClient.get('projects/'),
  createProject: (data: any) => apiClient.post('projects/', data),
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
  getDebtsGrouped: () => apiClient.get('debts-grouped/'),
};

export default apiClient;
