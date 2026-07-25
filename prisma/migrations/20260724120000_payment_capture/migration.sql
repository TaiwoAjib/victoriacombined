-- Allow payment rows to exist before (or without) a booking:
--  * a payment intent is recorded the moment checkout starts
--  * failed attempts may never produce a booking
ALTER TABLE "payments" ALTER COLUMN "booking_id" DROP NOT NULL;

-- Fast lookup by Stripe id for webhook reconciliation
CREATE INDEX IF NOT EXISTS "payments_stripe_payment_id_idx" ON "payments"("stripe_payment_id");
