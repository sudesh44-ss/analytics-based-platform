import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyWebhookSignature, upgradeUserEntitlement } from '../services/billing.js';
import { getSupabaseAdmin } from '../services/supabase.js';

export async function webhookRoutes(app: FastifyInstance) {
  app.post('/webhooks/razorpay', async (req: FastifyRequest, reply: FastifyReply) => {
    const signature = req.headers['x-razorpay-signature'] as string;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret || !signature) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_SIGNATURE', message: 'Missing webhook signature or secret.' },
      });
    }

    const rawBody = (req as any).rawBody as Buffer;
    const isValid = verifyWebhookSignature(rawBody, signature, secret);

    if (!isValid) {
      req.log.warn('Invalid Razorpay webhook signature attempt');
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'HMAC signature verification failed.' },
      });
    }

    const event = req.body as any;
    const providerEventId = event?.event_id || event?.id || `evt_${Date.now()}`;
    const eventName = event?.event || 'unknown';

    const supabase = getSupabaseAdmin();

    // 1. Durably Persist Event (Idempotent unique constraint on provider_event_id)
    const { error: insertErr } = await supabase.from('webhook_events').insert({
      provider: 'razorpay',
      provider_event_id: providerEventId,
      event_name: eventName,
      payload: event,
      status: 'PENDING',
    });

    if (insertErr && insertErr.code === '23505') {
      // Duplicate event delivery; acknowledge safely
      return reply.status(200).send({ success: true, message: 'Event already processed.' });
    }

    // 2. Process Critical Billing Events Asynchronously
    try {
      if (eventName === 'subscription.charged' || eventName === 'payment.captured') {
        const sub = event?.payload?.subscription?.entity;
        const subId = sub?.id;
        const userId = sub?.notes?.userId;

        if (userId && subId) {
          await upgradeUserEntitlement(userId, subId, sub?.notes?.internalPlanId || 'PRO_MONTHLY');
        }
      } else if (eventName === 'payment.failed') {
        const subId = event?.payload?.payment?.entity?.subscription_id;
        if (subId) {
          // Trigger 7-day Grace Period
          const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          await supabase
            .from('subscriptions')
            .update({
              entitlement_status: 'GRACE_PERIOD',
              grace_period_end: gracePeriodEnd,
              updated_at: new Date().toISOString(),
            })
            .eq('provider_subscription_id', subId);
        }
      }

      // Mark event PROCESSED
      await supabase
        .from('webhook_events')
        .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
        .eq('provider_event_id', providerEventId);
    } catch (err: any) {
      req.log.error(err, 'Failed to process webhook event body');
      await supabase
        .from('webhook_events')
        .update({ status: 'FAILED', last_error: err.message })
        .eq('provider_event_id', providerEventId);
    }

    return reply.status(200).send({ success: true, message: 'Webhook received.' });
  });
}
