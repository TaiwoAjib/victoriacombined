import prisma from '../utils/prisma';
import { emailService } from './emailService';
import { notificationQueue } from './notificationQueueService';

export const reminderService = {
  /**
   * Check for bookings tomorrow and send reminders
   * Run this job every hour
   */
  checkAndSendReminders: async () => {
    try {
      console.log('Running reminder check...');
      
      const settings = await prisma.salonSettings.findFirst();
      const timeZone = settings?.timezone || 'UTC';

      const now = new Date();
      // Get current hour in Salon's Timezone using Intl
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hour: 'numeric'
      });
      // formatter.format(now) returns string "10" for 10 AM.
      // However, if it's "24" it might be 0. Let's check.
      // 'numeric' usually returns 0-23 or 1-24 depending on locale.
      // en-US with hour12: false returns 0-23.
      const currentHour = parseInt(formatter.format(now));
      
      // Calculate "Tomorrow"
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Construct start and end of "tomorrow" to query bookingDate
      // We assume bookingDate is stored as midnight UTC or local date
      // Prisma @db.Date usually stores YYYY-MM-DD. When queried, it returns Date at 00:00 UTC.
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const startOfTomorrow = new Date(`${tomorrowStr}T00:00:00.000Z`);
      const endOfTomorrow = new Date(`${tomorrowStr}T23:59:59.999Z`);

      // Find bookings for tomorrow
      const bookings = await prisma.booking.findMany({
        where: {
          bookingDate: {
            gte: startOfTomorrow,
            lte: endOfTomorrow
          },
          status: 'booked'
        },
        include: {
          customer: true,
          style: true,
          category: true
        }
      });

      console.log(`Found ${bookings.length} bookings for tomorrow (${tomorrowStr}). Checking times...`);

      for (const booking of bookings) {
        // Check if booking time matches current hour
        // We compare the Stored Hour (which is Wall Clock Time stored as UTC)
        // with the Current Hour (which is Wall Clock Time in Salon Timezone).
        const bookingHour = booking.bookingTime.getUTCHours();

        if (bookingHour === currentHour) {
            await reminderService.sendReminderForBooking(booking);
        }
      }

    } catch (error) {
      console.error('Error in checkAndSendReminders:', error);
    }
  },

  /**
   * Send reminder for a specific booking
   */
  sendReminderForBooking: async (booking: any) => {
    try {
      const { customer, style, category, bookingDate, bookingTime } = booking;
      
      if (!customer) return;
      if (customer.notificationConsent === false) return;

      // Check if reminder already sent
      // We look for a Notification of type EMAIL/SMS with metadata { bookingId: id, type: 'REMINDER' }
      // But checking DB for every booking might be slow?
      // For now, it's fine as volume is low.
      const alreadySent = await prisma.notification.findFirst({
        where: {
          metadata: {
            path: ['bookingId'],
            equals: booking.id
          },
          AND: {
            metadata: {
              path: ['type'],
              equals: 'REMINDER'
            }
          }
        }
      });

      if (alreadySent) {
        console.log(`Reminder already sent for booking ${booking.id}`);
        return;
      }

      const dateStr = bookingDate.toISOString().split('T')[0];
      const timeStr = bookingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      console.log(`Sending reminder for booking ${booking.id} to ${customer.email}`);

      // Send Email Reminder
      if (customer.email) {
        const serviceName = style?.name + (category ? ` - ${category.name}` : '');
        const { subject, html } = await emailService.getBookingReminderContent(
          customer.fullName,
          serviceName || 'Service',
          dateStr,
          timeStr
        );

        await notificationQueue.add(
          'EMAIL',
          'BN',
          customer.email,
          html,
          subject,
          { bookingId: booking.id, type: 'REMINDER' }
        );
      }

    } catch (error) {
      console.error(`Failed to send reminder for booking ${booking.id}:`, error);
    }
  }
};
