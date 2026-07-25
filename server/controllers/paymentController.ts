import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import stripe, { recordPaymentFromIntent } from '../utils/stripe';

/**
 * Stripe webhook — the reliable server-to-server callback.
 *
 * Stripe calls this endpoint directly whenever a payment succeeds or fails, so
 * payment records are captured even if the customer closes the tab. Mounted in
 * app.ts BEFORE express.json() with a raw body parser, because signature
 * verification requires the exact raw payload.
 *
 * Set STRIPE_WEBHOOK_SECRET (from the Stripe dashboard endpoint) to verify
 * signatures. Configure the endpoint URL as:
 *   https://victoriabraidsandmicrolocs.com/api/payments/webhook
 * subscribed to: payment_intent.succeeded, payment_intent.payment_failed
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'];
  let event: any;

  try {
    if (secret && signature) {
      // req.body is a Buffer here (express.raw)
      event = stripe.webhooks.constructEvent(req.body as Buffer, signature as string, secret);
    } else {
      // No secret configured — accept unverified (insecure). Warn loudly so this
      // gets fixed in production; the payload still only references real Stripe IDs.
      console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set — processing event WITHOUT signature verification');
      const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
      event = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
  } catch (err: any) {
    console.error('[stripe-webhook] signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const intent = event.data.object;
        await recordPaymentFromIntent(prisma, intent.id);
        console.log(`[stripe-webhook] recorded ${event.type} for ${intent.id}`);
        break;
      }
      default:
        // Ignore other event types
        break;
    }
  } catch (err: any) {
    // Log but still 200 — returning non-2xx makes Stripe retry endlessly.
    console.error('[stripe-webhook] failed to process event:', err?.message || err);
  }

  res.json({ received: true });
};
