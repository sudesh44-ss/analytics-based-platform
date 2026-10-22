import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  domain: z.string().min(1, 'Domain or URL is required').max(255),
});

export const CreateAuditSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  maxPages: z.number().int().min(1).max(1000).default(50),
  crawlDepth: z.number().int().min(1).max(10).default(3),
  enableJs: z.boolean().default(false),
  performanceUrls: z.array(z.string().url()).max(3).optional(),
});

export const UpdateIssueStatusSchema = z.object({
  status: z.enum(['OPEN', 'FIXED', 'IGNORED']),
  note: z.string().max(500).optional(),
});

export const CreateCheckoutSchema = z.object({
  planId: z.enum(['PRO_MONTHLY', 'PRO_YEARLY']),
});

export const VerifyPaymentSchema = z.object({
  razorpayPaymentId: z.string().min(1),
  razorpaySubscriptionId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(100).optional(),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
