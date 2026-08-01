import prisma from '../utils/prisma';

/**
 * Data-retention purge.
 *
 * Permanently deletes old records to keep the database small. DESTRUCTIVE and
 * irreversible — controlled by env vars so it can be tuned or disabled without
 * a code change:
 *   PURGE_ENABLED                  'false' to turn the daily job off (default on)
 *   PURGE_RETENTION_DAYS           general retention, days (default 30)
 *   PURGE_PAYMENT_RETENTION_DAYS   payment retention, days (default 60 = 2 months)
 *
 * What it removes:
 *   1. notifications — older than the general window (transient email/SMS log)
 *   2. bookings      — appointment (bookingDate) older than the general window;
 *                      UPCOMING appointments are never deleted regardless of age
 *   3. payments      — kept for the LONGER payment window (2 months). Payments
 *                      of a booking being purged are first detached (booking_id
 *                      set to null) if still within the payment window, so the
 *                      ON DELETE CASCADE can't remove them early; they are then
 *                      deleted only once they pass the payment window.
 *
 * Net effect: a payment record survives at least PURGE_PAYMENT_RETENTION_DAYS,
 * and payments belonging to still-existing bookings are kept as long as the
 * booking exists.
 */
export const purgeService = {
  async purgeOldRecords(): Promise<void> {
    if ((process.env.PURGE_ENABLED || 'true').toLowerCase() === 'false') {
      console.log('[purge] disabled (PURGE_ENABLED=false) — skipping');
      return;
    }

    const days = Number(process.env.PURGE_RETENTION_DAYS) || 30;
    const paymentDays = Number(process.env.PURGE_PAYMENT_RETENTION_DAYS) || 60;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const paymentCutoff = new Date();
    paymentCutoff.setDate(paymentCutoff.getDate() - paymentDays);

    try {
      // 1. Transient notification logs
      const notifications = await prisma.notification.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      // 2. Identify past bookings to purge (appointment older than the general
      //    window). bookingDate — NOT createdAt — so upcoming appointments stay.
      const toPurge = await prisma.booking.findMany({
        where: { bookingDate: { lt: cutoff } },
        select: { id: true },
      });
      const bookingIds = toPurge.map((b) => b.id);

      // 3. Preserve payment records for the 2-month window: detach payments that
      //    are still within the payment window from the bookings about to be
      //    deleted, so the cascade doesn't remove them early. They live on as
      //    orphan records until they age past the payment window (step 5).
      let detached = { count: 0 };
      if (bookingIds.length > 0) {
        detached = await prisma.payment.updateMany({
          where: { bookingId: { in: bookingIds }, createdAt: { gte: paymentCutoff } },
          data: { bookingId: null },
        });
      }

      // 4. Delete the past bookings. Cascade now only removes payments still
      //    attached to them — i.e. payments already older than the payment
      //    window, which we want gone anyway.
      let bookings = { count: 0 };
      if (bookingIds.length > 0) {
        bookings = await prisma.booking.deleteMany({
          where: { id: { in: bookingIds } },
        });
      }

      // 5. Delete orphan payment records older than the payment window (failed/
      //    abandoned intents, plus payments detached in step 3 once they age out).
      //    Payments still linked to an existing booking are kept.
      const payments = await prisma.payment.deleteMany({
        where: { bookingId: null, createdAt: { lt: paymentCutoff } },
      });

      console.log(
        `[purge] Removed ${notifications.count} notifications, ${bookings.count} past bookings, ` +
        `and ${payments.count} payments older than ${paymentDays} days ` +
        `(${detached.count} recent payments detached and preserved).`
      );
    } catch (err) {
      console.error('[purge] Failed to purge old records:', err);
    }
  },
};
