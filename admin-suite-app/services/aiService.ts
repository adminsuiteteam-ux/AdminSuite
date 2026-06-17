/**
 * AdminSuite AI Service
 * Typed client for all /api/ai/ endpoints.
 */

import apiClient from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIChatResponse {
  reply: string;
}

export interface AIFinanceForecast {
  health_score: number;
  assessment: string;
  recommendations: string[];
  at_risk_budgets: string[];
  profit_trend: 'up' | 'down' | 'stable';
  profit_estimate: string;
  error?: string;
}

export interface AIEmployeeInsight {
  risk_level: 'low' | 'medium' | 'high';
  risk_summary: string;
  strengths: string[];
  concerns: string[];
  recommended_actions: string[];
  review_draft: string;
  error?: string;
}

export interface AIClientInsight {
  client_id: number;
  client_name: string;
  health: 'healthy' | 'at_risk' | 'urgent';
  reason: string;
  recommended_action: string;
}

export interface AIClientInsightsResponse {
  insights: AIClientInsight[];
  summary: string;
  error?: string;
}

export interface AIEmailDraft {
  subject: string;
  body: string;
  error?: string;
}

export interface AISearchResult {
  interpreted_as: string;
  model: string;
  count: number;
  results: any[];
  error?: string;
}

export interface AIChatSummary {
  summary_points: string[];
  action_items: string[];
  error?: string;
}

export interface AIReplySuggestions {
  suggestions: string[];
  error?: string;
}

export interface AIStatus {
  ai_enabled: boolean;
  key_configured: boolean;
  model: string;
  features: Record<string, boolean>;
}

// ─── AI Service ───────────────────────────────────────────────────────────────

export const aiService = {
  /**
   * Ask any business question in plain English.
   * POST /api/ai/chat/
   */
  chat: (message: string) =>
    apiClient.post<AIChatResponse>('ai/chat/', { message }, { timeout: 45000 }),

  /**
   * Get a financial health score and 30-day forecast.
   * GET /api/ai/finance-forecast/
   */
  getFinanceForecast: () =>
    apiClient.get<AIFinanceForecast>('ai/finance-forecast/', { timeout: 45000 }),

  /**
   * Get HR performance insights and review draft for one employee.
   * GET /api/ai/employee-insights/<id>/
   */
  getEmployeeInsights: (employeeId: number) =>
    apiClient.get<AIEmployeeInsight>(`ai/employee-insights/${employeeId}/`, { timeout: 45000 }),

  /**
   * Get health status for all clients (healthy / at_risk / urgent).
   * GET /api/ai/client-insights/
   */
  getClientInsights: () =>
    apiClient.get<AIClientInsightsResponse>('ai/client-insights/', { timeout: 45000 }),

  /**
   * Generate a professional email for a specific client.
   * POST /api/ai/draft-client-email/
   */
  draftClientEmail: (clientId: number, purpose: string) =>
    apiClient.post<AIEmailDraft>('ai/draft-client-email/', { client_id: clientId, purpose }, { timeout: 30000 }),

  /**
   * Generate a full executive business report.
   * POST /api/ai/generate-report/
   */
  generateReport: (period: string) =>
    apiClient.post<{ report: string; period: string; business_name: string }>(
      'ai/generate-report/',
      { period },
      { timeout: 60000 }
    ),

  /**
   * Search any data using a plain-English query.
   * POST /api/ai/search/
   */
  search: (query: string) =>
    apiClient.post<AISearchResult>('ai/search/', { query }, { timeout: 30000 }),

  /**
   * Summarize team chat messages from the last N hours.
   * POST /api/ai/chat-summary/
   */
  summarizeChat: (hours: number = 24) =>
    apiClient.post<AIChatSummary>('ai/chat-summary/', { hours }, { timeout: 30000 }),

  /**
   * Get 3 short reply suggestions for a received message.
   * POST /api/ai/reply-suggestions/
   */
  getReplySuggestions: (message: string, senderName: string, context?: string) =>
    apiClient.post<AIReplySuggestions>(
      'ai/reply-suggestions/',
      { message, sender_name: senderName, context: context ?? '' },
      { timeout: 20000 }
    ),

  /**
   * Check if AI features are enabled and configured.
   * GET /api/ai/status/
   */
  getStatus: () =>
    apiClient.get<AIStatus>('ai/status/'),
};

export default aiService;
