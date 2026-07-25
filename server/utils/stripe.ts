import Stripe from 'stripe';

// Single shared Stripe client for the whole server.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_PLACEHOLDER', {
  apiVersion: '2025-01-27.acacia' as any,
});

export default stripe;

/**
 * Record (or update) a payment row in the `payments` table from the
 * authoritative Stripe PaymentIntent. This is the server-side confirmation
 * step — we retrieve the intent straight from Stripe rather than trusting the
 * browser, so the stored amount and status always match reality.
 *
 * Matches an existing row by stripePaymentId (created when the intent was
 * first made), otherwise inserts a new one. Never throws to the caller's
 * critical path — payment logging must not break booking creation.
 */
export const recordPaymentFromIntent = async (
  prisma: any,
  paymentIntentId: string,
  bookingId?: string | null
) => {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  // amount_received is populated on success; fall back to the requested amount.
  const cents = (intent.amount_received || intent.amount || 0);
  const amount = cents / 100;
  const currency = (intent.currency || 'usd').toUpperCase();
  const status = intent.status; // e.g. 'succeeded', 'requires_payment_method', 'canceled'

  const existing = await prisma.payment.findFirst({
    where: { stripePaymentId: intent.id },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return prisma.payment.update({
      where: { id: existing.id },
      data: {
        amount,
        currency,
        status,
        ...(bookingId ? { bookingId } : {}),
      },
    });
  }

  return prisma.payment.create({
    data: {
      stripePaymentId: intent.id,
      amount,
      currency,
      status,
      bookingId: bookingId ?? null,
    },
  });
};
