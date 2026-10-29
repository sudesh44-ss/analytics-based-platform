import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreateCheckoutSchema, VerifyPaymentSchema } from '@sitescope/shared';
import { requireAuth } from '../middleware/auth.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../services/supabase.js';
import {
  getRazorpayClient,
  verifyCheckoutSignature,
  upgradeUserEntitlement,
} from '../services/billing.js';

export const DEFAULT_PLANS = [
  {
    id: 'FREE',
    name: 'SiteScope Free',
    interval: 'free',
    amount_paise: 0,
    tax_percent: 18.00,
    currency: 'INR',
    max_projects: 1,
    max_pages_per_audit: 50,
    max_daily_audits: 3,
    max_performance_urls: 0,
    retention_days: 7,
    is_active: true,
  },
  {
    id: 'PRO_MONTHLY',
    name: 'SiteScope Pro (Monthly)',
    interval: 'monthly',
    amount_paise: 79900,
    tax_percent: 18.00,
    currency: 'INR',
    max_projects: 10,
    max_pages_per_audit: 1000,
    max_daily_audits: 30,
    max_performance_urls: 3,
    retention_days: 90,
    is_active: true,
  },
  {
    id: 'PRO_YEARLY',
    name: 'SiteScope Pro (Yearly)',
    interval: 'yearly',
    amount_paise: 799900,
    tax_percent: 18.00,
    currency: 'INR',
    max_projects: 10,
    max_pages_per_audit: 1000,
    max_daily_audits: 30,
    max_performance_urls: 3,
    retention_days: 90,
    is_active: true,
  },
];

export async function billingRoutes(app: FastifyInstance) {
  // Publicly readable plans
  app.get('/billing/plans', async (req: FastifyRequest) => {
    try {
      const supabase = getSupabaseAdmin();
      const { data: plans, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('amount_paise', { ascending: true });

      if (error) {
        req.log.warn({ err: error.message }, 'Failed to query plans from Supabase; serving configuration-defined plans');
        return { success: true, data: { items: DEFAULT_PLANS } };
      }

      if (!plans || plans.length === 0) {
        return { success: true, data: { items: DEFAULT_PLANS } };
      }

      return { success: true, data: { items: plans } };
    } catch (err: any) {
      req.log.warn({ err: err?.message }, 'Supabase unreachable for billing plans; serving configuration-defined plans');
      return { success: true, data: { items: DEFAULT_PLANS } };
    }
  });

  // Protected Billing Endpoints
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', requireAuth);

    // Get Current Subscription Status
    protectedApp.get('/billing/subscription', async (req: FastifyRequest) => {
      const userId = (req as any).user.id;

      if (!isSupabaseConfigured()) {
        return {
          success: true,
          data: {
            planId: 'FREE',
            entitlementStatus: 'FREE',
            status: 'active',
          },
        };
      }

      try {
        const supabase = getSupabaseAdmin();
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*, plans(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          success: true,
          data: subscription || {
            planId: 'FREE',
            entitlementStatus: 'FREE',
            status: 'active',
          },
        };
      } catch (err: any) {
        req.log.warn({ err }, 'Error fetching subscription. Returning default Free status.');
        return {
          success: true,
          data: {
            planId: 'FREE',
            entitlementStatus: 'FREE',
            status: 'active',
          },
        };
      }
    });

    // Get Current Quota Usage Ledger
    protectedApp.get('/billing/usage', async (req: FastifyRequest) => {
      const userId = (req as any).user.id;
      const today = new Date().toISOString().split('T')[0];

      if (!isSupabaseConfigured()) {
        return {
          success: true,
          data: {
            periodDate: today,
            currentAuditsCount: 0,
            maxDailyAudits: 3,
            remainingDailyAudits: 3,
            projectsCount: 0,
            maxProjects: 1,
            maxPagesPerAudit: 50,
            entitlementStatus: 'FREE',
          },
        };
      }

      try {
        const supabase = getSupabaseAdmin();

        const { data: usage } = await supabase
          .from('usage_ledger')
          .select('*')
          .eq('user_id', userId)
          .eq('period_date', today)
          .maybeSingle();

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*, plans(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: projectCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_archived', false);

        const maxDaily = usage?.max_daily_audits ?? (sub?.plans?.max_daily_audits || 3);
        const usedDaily = usage?.current_audits_count ?? 0;
        const maxProjects = sub?.plans?.max_projects || 1;
        const maxPages = sub?.plans?.max_pages_per_audit || 50;

        return {
          success: true,
          data: {
            periodDate: today,
            currentAuditsCount: usedDaily,
            maxDailyAudits: maxDaily,
            remainingDailyAudits: Math.max(0, maxDaily - usedDaily),
            projectsCount: projectCount || 0,
            maxProjects,
            maxPagesPerAudit: maxPages,
            entitlementStatus: sub?.entitlement_status || 'FREE',
          },
        };
      } catch (err: any) {
        req.log.warn({ err }, 'Error fetching usage. Returning default free quotas.');
        return {
          success: true,
          data: {
            periodDate: today,
            currentAuditsCount: 0,
            maxDailyAudits: 3,
            remainingDailyAudits: 3,
            projectsCount: 0,
            maxProjects: 1,
            maxPagesPerAudit: 50,
            entitlementStatus: 'FREE',
          },
        };
      }
    });

    // Get Payment History & Invoices
    protectedApp.get('/billing/invoices', async (req: FastifyRequest) => {
      const userId = (req as any).user.id;

      if (!isSupabaseConfigured()) {
        return {
          success: true,
          data: {
            items: [],
          },
        };
      }

      try {
        const supabase = getSupabaseAdmin();
        const { data: invoices, error } = await supabase
          .from('billing_invoices')
          .select('*, payments(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return {
          success: true,
          data: {
            items: invoices || [],
          },
        };
      } catch (err: any) {
        req.log.warn({ err }, 'Error fetching billing invoices');
        return {
          success: true,
          data: {
            items: [],
          },
        };
      }
    });

    // Create Razorpay Subscription Checkout
    protectedApp.post('/billing/checkout', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).user.id;
      const body = CreateCheckoutSchema.parse(req.body);

      const razorpay = getRazorpayClient();
      if (!razorpay) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'BILLING_GATEWAY_NOT_CONFIGURED',
            message: 'Payment gateway credentials are not yet configured.',
          },
        });
      }

      const planIdEnv =
        body.planId === 'PRO_MONTHLY'
          ? process.env.RAZORPAY_PLAN_PRO_MONTHLY
          : process.env.RAZORPAY_PLAN_PRO_YEARLY;

      if (!planIdEnv) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'PLAN_NOT_CONFIGURED',
            message: 'Selected subscription plan is not configured in environment.',
          },
        });
      }

      try {
        const subscription = await razorpay.subscriptions.create({
          plan_id: planIdEnv,
          total_count: 12,
          quantity: 1,
          customer_notify: 1,
          notes: {
            userId,
            internalPlanId: body.planId,
          },
        });

        const supabase = getSupabaseAdmin();
        await supabase.from('subscriptions').insert({
          user_id: userId,
          plan_id: body.planId,
          provider_subscription_id: subscription.id,
          status: 'created',
          entitlement_status: 'FREE',
        });

        return reply.status(201).send({
          success: true,
          data: {
            subscriptionId: subscription.id,
            keyId: process.env.RAZORPAY_KEY_ID,
          },
        });
      } catch (err: any) {
        req.log.error(err, 'Failed to create Razorpay subscription');
        return reply.status(500).send({
          success: false,
          error: { code: 'CHECKOUT_CREATION_FAILED', message: err.message },
        });
      }
    });

    // Verify Payment Signature & Activate Pro
    protectedApp.post('/billing/verify', async (req: FastifyRequest, reply: FastifyReply) => {
      const userId = (req as any).user.id;
      const body = VerifyPaymentSchema.parse(req.body);

      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        return reply.status(500).send({
          success: false,
          error: { code: 'GATEWAY_SECRET_MISSING', message: 'Billing secret unconfigured.' },
        });
      }

      const isValid = verifyCheckoutSignature(
        body.razorpayPaymentId,
        body.razorpaySubscriptionId,
        body.razorpaySignature,
        secret
      );

      if (!isValid) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PAYMENT_SIGNATURE', message: 'Signature verification failed.' },
        });
      }

      await upgradeUserEntitlement(userId, body.razorpaySubscriptionId, 'PRO_MONTHLY');

      return {
        success: true,
        data: {
          message: 'Payment verified and Pro plan activated successfully.',
          entitlementStatus: 'PRO_ACTIVE',
        },
      };
    });
  });
}
