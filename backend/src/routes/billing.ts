import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreateCheckoutSchema, VerifyPaymentSchema } from '@sitescope/shared';
import { requireAuth } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../services/supabase.js';
import {
  getRazorpayClient,
  verifyCheckoutSignature,
  upgradeUserEntitlement,
} from '../services/billing.js';

export async function billingRoutes(app: FastifyInstance) {
  // Publicly readable plans
  app.get('/billing/plans', async () => {
    const supabase = getSupabaseAdmin();
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('amount_paise', { ascending: true });

    if (error) throw error;

    return { success: true, data: { items: plans || [] } };
  });

  // Protected Billing Endpoints
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', requireAuth);

    // Get Current Subscription Status
    protectedApp.get('/billing/subscription', async (req: FastifyRequest) => {
      const userId = (req as any).user.id;
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
