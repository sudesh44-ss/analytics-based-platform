export type PlanType = 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY';

export type EntitlementStatus =
  | 'FREE'
  | 'PRO_ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'CANCELLATION_PENDING'
  | 'DOWNGRADED';

export type AuditJobStatus =
  | 'QUEUED'
  | 'VALIDATING'
  | 'CRAWLING'
  | 'ANALYZING'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'RETRYING';

export type IssueCategory =
  | 'SEO'
  | 'PERFORMANCE'
  | 'SECURITY'
  | 'TECHNICAL_HEALTH';

export type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type IssueStatus = 'OPEN' | 'FIXED' | 'IGNORED' | 'REOPENED';

export interface AuditConfig {
  maxPages: number;
  crawlDepth: number;
  enableJs: boolean;
  performanceUrls?: string[];
  respectRobotsTxt?: boolean;
}

export interface Project {
  id: string;
  userId?: string;
  user_id?: string;
  name: string;
  domain: string;
  normalizedUrl?: string;
  normalized_url?: string;
  isVerified?: boolean;
  is_verified?: boolean;
  verificationToken?: string;
  verification_token?: string;
  isArchived?: boolean;
  is_archived?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface AuditJob {
  id: string;
  projectId?: string;
  project_id?: string;
  userId?: string;
  user_id?: string;
  status: AuditJobStatus;
  config: AuditConfig;
  pagesCrawled?: number;
  pages_crawled?: number;
  maxPages?: number;
  max_pages?: number;
  overallScore?: number | null;
  overall_score?: number | null;
  failureReason?: string | null;
  failure_reason?: string | null;
  startedAt?: string | null;
  started_at?: string | null;
  completedAt?: string | null;
  completed_at?: string | null;
  heartbeatAt?: string;
  heartbeat_at?: string;
  retryCount?: number;
  retry_count?: number;
  createdAt?: string;
  created_at?: string;
}

export interface CrawledPage {
  id: string;
  auditJobId?: string;
  audit_job_id?: string;
  projectId?: string;
  project_id?: string;
  url: string;
  normalizedUrl?: string;
  normalized_url?: string;
  statusCode?: number;
  status_code?: number;
  responseTimeMs?: number;
  response_time_ms?: number;
  contentType?: string | null;
  content_type?: string | null;
  contentLength?: number | null;
  content_length?: number | null;
  title?: string | null;
  metaDescription?: string | null;
  meta_description?: string | null;
  h1?: string | null;
  canonicalUrl?: string | null;
  canonical_url?: string | null;
  robotsMeta?: string | null;
  robots_meta?: string | null;
  isIndexable?: boolean;
  is_indexable?: boolean;
  depth?: number;
  createdAt?: string;
  created_at?: string;
}

export interface ExtractedLink {
  id: string;
  auditJobId: string;
  sourcePageId: string;
  targetUrl: string;
  anchorText?: string | null;
  isInternal: boolean;
  statusCode?: number | null;
  isBroken: boolean;
  createdAt: string;
}

export interface Issue {
  id: string;
  projectId: string;
  ruleId: string;
  ruleVersion: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  explanation: string;
  recommendation: string;
  scoreImpact: number;
  status: IssueStatus;
  firstAuditId: string;
  latestAuditId: string;
  firstObservedAt: string;
  lastObservedAt: string;
}

export interface IssueOccurrence {
  id: string;
  issueId: string;
  auditJobId: string;
  affectedUrl: string;
  evidence: Record<string, unknown>;
  createdAt: string;
}

export interface AuditSummary {
  id: string;
  auditJobId: string;
  projectId: string;
  overallScore: number;
  seoScore: number;
  performanceScore: number;
  technicalHealthScore: number;
  securityScore: number;
  totalPagesCrawled: number;
  totalIssuesCount: number;
  criticalIssuesCount: number;
  highIssuesCount: number;
  mediumIssuesCount: number;
  lowIssuesCount: number;
  infoIssuesCount: number;
  createdAt: string;
}

export interface PerformanceMetric {
  id: string;
  auditJobId: string;
  projectId: string;
  testedUrl: string;
  deviceMode: 'MOBILE' | 'DESKTOP';
  source: 'PAGESPEED_API' | 'LIGHTHOUSE_WORKER';
  performanceScore: number;
  accessibilityScore?: number | null;
  bestPracticesScore?: number | null;
  seoScore?: number | null;
  fcpMs?: number | null;
  lcpMs?: number | null;
  cls?: number | null;
  inpMs?: number | null;
  tbtMs?: number | null;
  speedIndexMs?: number | null;
  hasFieldData: boolean;
  opportunities?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Plan {
  id: PlanType;
  name: string;
  interval: 'free' | 'monthly' | 'yearly';
  amountPaise: number;
  taxPercent: number;
  currency: string;
  maxProjects: number;
  maxPagesPerAudit: number;
  maxDailyAudits: number;
  maxPerformanceUrls: number;
  retentionDays: number;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanType;
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  status: string;
  entitlementStatus: EntitlementStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  gracePeriodEnd?: string | null;
  cancelledAt?: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string | null;
  providerPaymentId?: string | null;
  providerOrderId?: string | null;
  amountPaise: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
  method?: string | null;
  errorCode?: string | null;
  errorDescription?: string | null;
  capturedAt?: string | null;
  createdAt: string;
}

export interface UsageLedger {
  id: string;
  userId: string;
  periodDate: string;
  currentAuditsCount: number;
  maxDailyAudits: number;
  updatedAt: string;
}
