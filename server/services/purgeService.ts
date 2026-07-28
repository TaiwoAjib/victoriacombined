import prisma from '../utils/prisma';

/**
 * Data-retention purge.
 *
 * Permanently deletes old records to keep the database small. This is
 * DESTRUCTIVE and irreversible — controlled by env vars so it can be tuned or
 * disabled without a code change:
 *   PURGE_ENABLED         'false' to turn the daily job off entirely (default on)
 *   PURGE_RETENTION_DAYS  number of days to keep (default 30)
 *
 * What it removes (older than the retention window):
 *   1. notifications  — by createdAt (transient email/SMS log)
 *   2. payments       — orphan rows (no booking) by createdAt, e.g. failed/
 *                       abandoned intents; payments linked to a purged booking
 *                       are removed automatically by the ON DELETE CASCADE FK
 *   3. bookings       — by bookingDate (appointment date), so UPCOMING
 *                       appointments are never deleted regardless of age
 */
export const purgeService = {
  async purgeOldRecords(): Promise<void> {
    if ((process.env.PURGE_ENABLED || 'true').toLowerCase() === 'false') {
      console.log('[purge] disabled (PURGE_ENABLED=false) — skipping');
      return;
    }

    const days = Number(process.env.PURGE_RETENTION_DAYS) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    try {
      // 1. Transient notification logs
      const notifications = await prisma.notification.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      // 2. Orphan payments with no booking (failed / abandoned intents).
      //    Payments tied to a booking are cascade-deleted in step 3.
      const orphanPayments = await prisma.payment.deleteMany({
        where: { bookingId: null, createdAt: { lt: cutoff } },
      });

      // 3. Past bookings (appointment >30d ago). bookingDate — NOT createdAt —
      //    so a future appointment is never purged. Linked payments cascade.
      const bookings = await prisma.booking.deleteMany({
        where: { bookingDate: { lt: cutoff } },
      });

      console.log(
        `[purge] Removed ${notifications.count} notifications, ` +
        `${orphanPayments.count} orphan payments, and ${bookings.count} past bookings ` +
        `(with their payments cascaded) older than ${days} days.`
      );
    } catch (err) {
      console.error('[purge] Failed to purge old records:', err);
    }
  },
};
