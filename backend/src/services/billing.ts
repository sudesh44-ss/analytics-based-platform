import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { getSupabaseAdmin } from './supabase.js';

let razorpayClient: Razorpay | null = null;

export function getRazorpayClient(): Razorpay | null {
  if (razorpayClient) return razorpayClient;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayClient;
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  if (!signature || !secret || !rawBody) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
  const actualBuffer = Buffer.from(signature, 'utf-8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function verifyCheckoutSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  secret: string
): boolean {
  const payload = `${paymentId}|${subscriptionId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
  const actualBuffer = Buffer.from(signature, 'utf-8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function upgradeUserEntitlement(userId: string, subscriptionId: string, planId: string) {
  const supabase = getSupabaseAdmin();

  // Update subscription status in PostgreSQL
  await supabase
    .from('subscriptions')
    .update({
      entitlement_status: 'PRO_ACTIVE',
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider_subscription_id', subscriptionId);

  // Update daily audits limit in usage_ledger
  await supabase
    .from('usage_ledger')
    .update({
      max_daily_audits: 30, // Pro tier entitlement
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('period_date', new Date().toISOString().split('T')[0]);
}
