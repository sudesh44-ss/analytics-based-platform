import { Project, AuditJob, CrawledPage, Issue } from '@sitescope/shared';
import { getActiveSessionToken, getSupabaseBrowserClient, isSupabaseConfigured } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface DashboardSummaryData {
  projectId: string;
  domain: string;
  overallScore: number;
  latestAuditCompletedAt: string | null;
  kpi: {
    totalPagesCrawled: number;
    totalIssuesCount: number;
    criticalIssuesCount: number;
    highIssuesCount: number;
    mediumIssuesCount: number;
    lowIssuesCount: number;
    dailyAuditsRemaining: number;
    dailyAuditsLimit: number;
  };
  categoryScores: {
    seo: number;
    performance: number;
    technicalHealth: number;
    security: number;
  };
  issuesBySeverity: Array<{
    severity: string;
    count: number;
  }>;
}

export interface TrendItem {
  audit_job_id: string;
  overall_score: number;
  seo_score: number;
  performance_score: number;
  technical_health_score: number;
  security_score: number;
  total_pages_crawled: number;
  created_at: string;
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('sitescope_auth_token');
  if (stored) return stored;

  if (!isSupabaseConfigured() && process.env.NODE_ENV === 'development') {
    return 'dev-token';
  }
  return '';
}

export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sitescope_auth_token', token);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<ApiResponse<T>> {
  // 1. Resolve fresh token via Supabase or localStorage
  let token = await getActiveSessionToken();
  if (!token) {
    token = getAuthToken();
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();

    // 2. Intercept 401 Session Token Expiration & attempt automatic refresh
    if (!res.ok && res.status === 401 && !isRetry) {
      const errCode = data?.error?.code;
      if (errCode === 'INVALID_TOKEN' || errCode === 'UNAUTHORIZED' || errCode === 'AUTH_VERIFICATION_FAILED') {
        const client = getSupabaseBrowserClient();
        if (client) {
          try {
            const { data: refreshed, error: refreshErr } = await client.auth.refreshSession();
            if (!refreshErr && refreshed.session?.access_token) {
              setAuthToken(refreshed.session.access_token);
              // Retry the original request once with fresh token
              return request<T>(endpoint, options, true);
            } else {
              // Refresh failed: clear invalid session state to prevent infinite loops
              if (typeof window !== 'undefined') {
                localStorage.removeItem('sitescope_auth_token');
              }
            }
          } catch {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('sitescope_auth_token');
            }
          }
        } else {
          // If Supabase client is not available or unconfigured, clear invalid token
          if (typeof window !== 'undefined') {
            localStorage.removeItem('sitescope_auth_token');
          }
        }
      }
    }

    return data as ApiResponse<T>;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err?.message || 'Failed to connect to SiteScope API server.',
      },
    };
  }
}

// 1. Projects API
export async function getProjects(): Promise<ApiResponse<{ items: Project[] }>> {
  return request<{ items: Project[] }>('/api/v1/projects');
}

export async function createProject(body: {
  name: string;
  domain: string;
}): Promise<ApiResponse<Project>> {
  return request<Project>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getProject(id: string): Promise<ApiResponse<Project>> {
  return request<Project>(`/api/v1/projects/${id}`);
}

// 2. Audits API
export async function getAudits(query?: {
  projectId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ items: (AuditJob & { projects?: { name: string; domain: string } })[]; pagination: Pagination }>> {
  const params = new URLSearchParams();
  if (query?.projectId) params.set('projectId', query.projectId);
  if (query?.status) params.set('status', query.status);
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));

  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<{ items: (AuditJob & { projects?: { name: string; domain: string } })[]; pagination: Pagination }>(`/api/v1/audits${qs}`);
}

export async function triggerAudit(body: {
  projectId: string;
  maxPages?: number;
  crawlDepth?: number;
  enableJs?: boolean;
}): Promise<ApiResponse<AuditJob>> {
  return request<AuditJob>('/api/v1/audits', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getAudit(auditId: string): Promise<ApiResponse<AuditJob & { projects?: { name: string; domain: string } }>> {
  return request<AuditJob & { projects?: { name: string; domain: string } }>(`/api/v1/audits/${auditId}`);
}

export async function getAuditPages(
  auditId: string,
  query?: { page?: number; limit?: number; search?: string }
): Promise<ApiResponse<{ items: CrawledPage[]; pagination: Pagination }>> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.search) params.set('search', query.search);

  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<{ items: CrawledPage[]; pagination: Pagination }>(`/api/v1/audits/${auditId}/pages${qs}`);
}

export async function getAuditIssues(
  auditId: string,
  query?: { page?: number; limit?: number; category?: string; severity?: string }
): Promise<ApiResponse<{ items: Issue[]; pagination: Pagination }>> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.category) params.set('category', query.category);
  if (query?.severity) params.set('severity', query.severity);

  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<{ items: Issue[]; pagination: Pagination }>(`/api/v1/audits/${auditId}/issues${qs}`);
}

export async function getAuditPerformanceMetrics(
  auditId: string
): Promise<ApiResponse<{ items: any[] }>> {
  return request<{ items: any[] }>(`/api/v1/audits/${auditId}/performance`);
}

// 3. Billing & Subscription API
export interface UsageData {
  periodDate: string;
  currentAuditsCount: number;
  maxDailyAudits: number;
  remainingDailyAudits: number;
  projectsCount: number;
  maxProjects: number;
  maxPagesPerAudit: number;
  entitlementStatus: string;
}

export interface InvoiceItem {
  id: string;
  invoice_number: string;
  subtotal_paise: number;
  tax_paise: number;
  total_paise: number;
  currency: string;
  pdf_url?: string;
  created_at: string;
  payments?: {
    status: string;
    provider_payment_id?: string;
  };
}

export async function getBillingPlans(): Promise<ApiResponse<{ items: any[] }>> {
  return request<{ items: any[] }>('/api/v1/billing/plans');
}

export async function getBillingSubscription(): Promise<ApiResponse<any>> {
  return request<any>('/api/v1/billing/subscription');
}

export async function getBillingUsage(): Promise<ApiResponse<UsageData>> {
  return request<UsageData>('/api/v1/billing/usage');
}

export async function getBillingInvoices(): Promise<ApiResponse<{ items: InvoiceItem[] }>> {
  return request<{ items: InvoiceItem[] }>('/api/v1/billing/invoices');
}

export async function createCheckout(planId: 'PRO_MONTHLY' | 'PRO_YEARLY'): Promise<ApiResponse<{ subscriptionId: string; keyId: string }>> {
  return request<{ subscriptionId: string; keyId: string }>('/api/v1/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
}

export async function verifyPayment(body: {
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
}): Promise<ApiResponse<any>> {
  return request<any>('/api/v1/billing/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// 4. Dashboard API
export async function getDashboardSummary(
  projectId: string
): Promise<ApiResponse<DashboardSummaryData>> {
  return request<DashboardSummaryData>(`/api/v1/dashboard/summary?projectId=${encodeURIComponent(projectId)}`);
}

export async function getDashboardTrends(
  projectId: string
): Promise<ApiResponse<{ projectId: string; trends: TrendItem[] }>> {
  return request<{ projectId: string; trends: TrendItem[] }>(`/api/v1/dashboard/audit-trends?projectId=${encodeURIComponent(projectId)}`);
}
