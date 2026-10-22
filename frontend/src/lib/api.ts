import { Project, AuditJob, CrawledPage, Issue } from '@sitescope/shared';

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
  return localStorage.getItem('sitescope_auth_token') || 'dev-token';
}

export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sitescope_auth_token', token);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
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
  query?: { page?: number; limit?: number }
): Promise<ApiResponse<{ items: Issue[]; pagination: Pagination }>> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));

  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<{ items: Issue[]; pagination: Pagination }>(`/api/v1/audits/${auditId}/issues${qs}`);
}

// 3. Dashboard API
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
