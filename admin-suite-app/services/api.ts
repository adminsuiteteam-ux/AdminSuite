import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── Base URL resolution ──────────────────────────────────────────────────────
// Priority 1: EXPO_PUBLIC_API_URL in .env (set for all builds, dev included)
// Priority 2: Dynamic fallback for local development
const getLocalHost = () => {
  if (Platform.OS === 'web') return 'localhost';
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) return ip;
  }
  return '192.168.135.152';
};

const PRODUCTION_URL = 'https://adminsuite-api.onrender.com';
const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
const HOST = getLocalHost();
const DEFAULT_URL = `http://${HOST}:8000/`;

// Use production URL from env if available, otherwise fall back to local dev
export const BASE_URL = ENV_API_URL
  ? (ENV_API_URL.endsWith('/') ? ENV_API_URL : `${ENV_API_URL}/`)
  : DEFAULT_URL;

let activeBaseUrl = BASE_URL;
const API_URL = `${activeBaseUrl}api/`;

// ─── Media URL helper ─────────────────────────────────────────────────────────
export const getMediaUrl = (path: string | null): string => {
  if (!path) return 'https://i.pravatar.cc/300';

  // Already a local device path — return as-is
  if (
    path.startsWith('file://') ||
    path.startsWith('content://') ||
    path.startsWith('ph://') ||
    path.startsWith('assets-library://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  // Already an absolute URL (e.g., from Cloudinary or production media)
  if (path.startsWith('http')) {
    // Rewrite localhost:8000 → production URL for when stored URLs are from local dev
    const localMatch = path.match(/^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\/(.*)$/);
    if (localMatch) {
      // Replace local host with active base URL
      return `${activeBaseUrl}${localMatch[3]}`;
    }
    // Any other absolute URL (Cloudinary, Render, etc.) — use as-is
    return path;
  }

  // Relative path — build from active base URL
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${activeBaseUrl}${cleanPath}`;
};

// ─── File attachment helper ───────────────────────────────────────────────────
export const appendFileToFormData = async (
  formData: FormData,
  fieldName: string,
  uri: string | null
) => {
  if (!uri) return;

  // Skip if the URI is already a remote server URL (already uploaded media).
  // We detect this by checking if it's an http(s) URL that is NOT a local
  // device file proxy (blob:, data:, file://, content://, ph://).
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    // Only re-upload if it points to our own active base URL on a local LAN/device IP,
    // because on mobile the image picker returns local device paths which may get
    // resolved to an http URL. We never want to re-send already-stored media.
    const isLocalPickerProxy =
      uri.includes('localhost') ||
      uri.includes('127.0.0.1') ||
      uri.includes('10.0.2.2') ||
      uri.startsWith(`http://${HOST}`);
    // Even those local references that contain /media/ are already stored on the server
    if (uri.includes('/media/') || !isLocalPickerProxy) return;
  }

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = uri.split('/').pop() || 'upload.jpg';
      formData.append(fieldName, blob, filename);
    } catch (e) {
      console.error(`Failed to append web file for ${fieldName}`, e);
    }
  } else {
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append(fieldName, { uri, name: filename, type } as any);
  }
};


// ─── Axios client ─────────────────────────────────────────────────────────────
let unauthorizedCallback: (() => void) | null = null;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30s default — handles Render cold-starts
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

// ─── URL resolution (skipped when EXPO_PUBLIC_API_URL is set) ─────────────────
const CANDIDATES = [
  ENV_API_URL ? (ENV_API_URL.endsWith('/') ? ENV_API_URL : `${ENV_API_URL}/`) : null,
  PRODUCTION_URL,
  `http://localhost:8000/`,
  `http://10.0.2.2:8000/`,
  Constants.expoConfig?.hostUri
    ? `http://${Constants.expoConfig.hostUri.split(':')[0]}:8000/`
    : null,
  `http://${HOST}:8000/`,
].filter((url): url is string => !!url);

const pingUrl = async (url: string): Promise<boolean> => {
  const cleanUrl = url.endsWith('/') ? url : `${url}/`;
  const target = `${cleanUrl}api/`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s ping timeout
    const response = await fetch(target, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);
    return (
      response.ok ||
      response.status === 200 ||
      response.status === 401 ||
      response.status === 403
    );
  } catch {
    return false;
  }
};

/**
 * Resolves the best backend URL.
 * If EXPO_PUBLIC_API_URL is set, it is trusted directly — no ping needed.
 * This eliminates the slow startup/login delay caused by pinging all candidates.
 */
export const resolveBackendUrl = async (): Promise<string | null> => {
  // Fast path: env var is set → trust it and update the client base URL
  if (ENV_API_URL) {
    const cleanBase = ENV_API_URL.endsWith('/') ? ENV_API_URL : `${ENV_API_URL}/`;
    activeBaseUrl = cleanBase;
    apiClient.defaults.baseURL = `${cleanBase}api/`;
    console.log(`[API] Using env backend URL: ${apiClient.defaults.baseURL}`);
    return ENV_API_URL;
  }

  // Dev fallback: try each local candidate
  const results = await Promise.all(
    CANDIDATES.map(async (candidate) => {
      const ok = await pingUrl(candidate);
      return { candidate, ok };
    })
  );

  const successful = results.find((r) => r.ok);
  if (successful) {
    const candidate = successful.candidate;
    const cleanBase = candidate.endsWith('/') ? candidate : `${candidate}/`;
    activeBaseUrl = cleanBase;
    apiClient.defaults.baseURL = `${cleanBase}api/`;
    console.log(`[API] Dynamic backend URL resolved to: ${apiClient.defaults.baseURL}`);
    return candidate;
  }

  // Fallback to Production URL if no candidates respond
  const cleanProd = PRODUCTION_URL.endsWith('/') ? PRODUCTION_URL : `${PRODUCTION_URL}/`;
  activeBaseUrl = cleanProd;
  apiClient.defaults.baseURL = `${cleanProd}api/`;
  console.warn(`[API] No backend candidate responded. Falling back to Production: ${apiClient.defaults.baseURL}`);
  return PRODUCTION_URL;
};

// Resolve on import (non-blocking)
resolveBackendUrl().catch((err) =>
  console.error('[API] Failed resolving backend:', err)
);

// ─── API service methods ──────────────────────────────────────────────────────
export const apiService = {
  // Auth
  login: (credentials: any) => apiClient.post('token-auth/', credentials),
  signup: (data: any) => apiClient.post('register/', data),
  getMe: () => apiClient.get('me/'),
  updateMe: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.patch('me/', data, {
      headers: {
        'Content-Type': isFormData ? undefined : 'application/json',
      },
      timeout: isFormData ? 60000 : 30000,
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
  confirmPasswordReset: (data: {
    email: string;
    code: string;
    new_password: string;
  }) => apiClient.post('auth/password-reset/confirm/', data),

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

  // Employees
  getEmployees: () => apiClient.get('employees/'),
  getEmployee: (id: string) => apiClient.get(`employees/${id}/`),
  createEmployee: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.post('employees/', data, {
      headers: {
        'Content-Type': isFormData ? undefined : 'application/json',
      },
      timeout: isFormData ? 60000 : 30000, // 60s for file uploads
    });
  },
  updateEmployee: (id: string, data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.put(`employees/${id}/`, data, {
      headers: {
        'Content-Type': isFormData ? undefined : 'application/json',
      },
      timeout: isFormData ? 60000 : 30000,
    });
  },
  patchEmployee: (id: string, data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.patch(`employees/${id}/`, data, {
      headers: {
        'Content-Type': isFormData ? undefined : 'application/json',
      },
      timeout: isFormData ? 60000 : 30000,
    });
  },
  deleteEmployee: (id: string) => apiClient.delete(`employees/${id}/`),

  flagEmployee: (
    id: string,
    data: { is_flagged: boolean; flag_reason?: string; flag_note?: string }
  ) => apiClient.post(`employees/${id}/flag/`, data),
  archiveEmployee: (id: string) => apiClient.post(`employees/${id}/archive/`),
  restoreEmployee: (id: string) => apiClient.post(`employees/${id}/restore/`),

  createTask: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.post('employee-tasks/', data, {
      headers: {
        'Content-Type': isFormData ? undefined : 'application/json',
      },
    });
  },
  createQuery: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.post('employee-queries/', data, {
      headers: {
        'Content-Type': isFormData ? undefined : 'application/json',
      },
    });
  },
  createLeave: (data: any) => apiClient.post('employee-leaves/', data),
  createMessage: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.post('employee-messages/', data, {
      headers: {
        'Content-Type': isFormData ? undefined : 'application/json',
      },
    });
  },
  createDocument: (data: any) =>
    apiClient.post('employee-documents/', data, {
      headers: { 'Content-Type': undefined },
      timeout: 60000,
    }),
  deleteDocument: (docId: string) =>
    apiClient.delete(`employee-documents/${docId}/`),
  createSalaryAdjustment: (data: any) =>
    apiClient.post('salary-adjustments/', data),

  // Clients
  getClients: () => apiClient.get('clients/'),
  getClient: (id: string) => apiClient.get(`clients/${id}/`),
  createClient: (data: any) => apiClient.post('clients/', data),
  updateClient: (id: string, data: any) => apiClient.put(`clients/${id}/`, data),
  patchClient: (id: string, data: any) => apiClient.patch(`clients/${id}/`, data),
  deleteClient: (id: string) => apiClient.delete(`clients/${id}/`),

  // Projects
  getProjects: () => apiClient.get('projects/'),
  createProject: (data: any) => apiClient.post('projects/', data, { timeout: 45000 }),
  updateProject: (id: string, data: any) =>
    apiClient.put(`projects/${id}/`, data, { timeout: 45000 }),
  patchProject: (id: string, data: any) =>
    apiClient.patch(`projects/${id}/`, data, { timeout: 45000 }),
  deleteProject: (id: string) => apiClient.delete(`projects/${id}/`),

  getTransactions: () => apiClient.get('transactions/'),
  createTransaction: (data: any) => apiClient.post('transactions/', data),
  getNotifications: () => apiClient.get('notifications/'),
  getBudgets: () => apiClient.get('budgets/'),
  createBudget: (data: any) => apiClient.post('budgets/', data),
  updateBudget: (id: string, data: any) => apiClient.patch(`budgets/${id}/`, data),
  deleteBudget: (id: string) => apiClient.delete(`budgets/${id}/`),
  getSavings: () => apiClient.get('savings/'),
  createSavings: (data: any) => apiClient.post('savings/', data),
  updateSavings: (id: string, data: any) => apiClient.patch(`savings/${id}/`, data),
  deleteSavings: (id: string) => apiClient.delete(`savings/${id}/`),
  getDebts: () => apiClient.get('debts/'),

  // Aggregated endpoints
  getMetrics: () => apiClient.get('metrics/'),
  getClientMetrics: () => apiClient.get('client-metrics/'),
  getPayrollMetrics: () => apiClient.get('payroll-metrics/'),
  togglePayrollMonth: (data: { month: string; paid: boolean }) =>
    apiClient.post('payroll-metrics/toggle/', data),
  getDebtsGrouped: () => apiClient.get('debts-grouped/'),
  deleteAccount: () => apiClient.delete('me/'),

  // Subscription Endpoints
  getSubscriptionLimits: () => apiClient.get('subscription/limits/'),
  upgradeSubscription: (data: { plan: string; payment_method?: any }) => apiClient.post('subscription/upgrade/', data),

  // Employee Portal Endpoints
  getEmployeeDashboard: () => apiClient.get('employee-portal/dashboard/'),
  getEmployeeFinance: () => apiClient.get('employee-portal/finance/'),
  updateEmployeeTask: (taskId: number, data: { status: string; description?: string }) =>
    apiClient.post(`employee-portal/tasks/${taskId}/update/`, data),

  // Chat Endpoints
  getChatContacts: () => apiClient.get('chat/contacts/'),
  getChatMessages: (recipientId?: number | 'group', groupId?: number) => {
    if (groupId) {
      return apiClient.get(`chat/messages/?group_id=${groupId}`);
    }
    if (!recipientId || recipientId === 'group') {
      return apiClient.get('chat/messages/');
    }
    return apiClient.get(`chat/messages/?recipient_id=${recipientId}`);
  },
  sendChatMessage: (data: { text: string; recipient_id?: number; group_id?: number; reply_to_id?: number }) =>
    apiClient.post('chat/send/', data),
  editChatMessage: (id: number, text: string) =>
    apiClient.put(`chat/messages/${id}/`, { text }),
  deleteChatMessage: (id: number) =>
    apiClient.delete(`chat/messages/${id}/`),
  pinChatMessage: (id: number) =>
    apiClient.post(`chat/messages/${id}/pin/`),
  createChatGroup: (data: { name: string; only_admins_can_chat?: boolean; members?: number[] }) =>
    apiClient.post('chat/groups/', data),
  updateChatGroup: (id: number, data: { name?: string; only_admins_can_chat?: boolean; members?: number[] }) =>
    apiClient.patch(`chat/groups/${id}/`, data),
  deleteChatGroup: (id: number) =>
    apiClient.delete(`chat/groups/${id}/`),

  // Admin Chat Controls
  getChatSettings: () =>
    apiClient.get('chat/settings/'),
  updateChatSettings: (data: { group_locked?: boolean }) =>
    apiClient.patch('chat/settings/', data),
  blockChatUser: (userId: number, block: boolean) =>
    apiClient.post('chat/block-user/', { user_id: userId, block }),

  // Chat Typing Status
  sendChatTyping: (data: { recipient_id?: number; group_id?: number; is_typing: boolean }) =>
    apiClient.post('chat/typing/', data),
  getChatTypingStatus: (recipientId?: number | 'group' | 'all', groupId?: number) => {
    if (recipientId === 'all') {
      return apiClient.get('chat/typing/?all=true');
    }
    if (groupId) {
      return apiClient.get(`chat/typing/?group_id=${groupId}`);
    }
    if (!recipientId || recipientId === 'group') {
      return apiClient.get('chat/typing/');
    }
    return apiClient.get(`chat/typing/?recipient_id=${recipientId}`);
  },

  // Push Devices
  registerDeviceToken: (data: { expo_push_token: string; device_name?: string; device_type?: string }) =>
    apiClient.post('devices/register/', data),
  unregisterDeviceToken: (data: { expo_push_token: string }) =>
    apiClient.post('devices/unregister/', data),
};

export default apiClient;
