import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { notificationQueue } from '../services/notificationQueueService';
import { emailService } from '../services/emailService';

/**
 * Broadcast Easter Greeting to all customers with notification consent (email only)
 */
export const broadcastEasterGreeting = async (req: Request, res: Response): Promise<void> => {
    try {
        // Find all customers who have consented to notifications
        const customers = await prisma.user.findMany({
            where: {
                role: 'customer',
                notificationConsent: true
            },
            select: {
                id: true,
                fullName: true,
                email: true
            }
        });

        console.log(`Found ${customers.length} customers for Easter broadcast.`);

        let queuedCount = 0;

        for (const customer of customers) {
            if (customer.email) {
                const { subject, html } = await emailService.getEasterGreetingContent(customer.fullName);
                await notificationQueue.add(
                    'EMAIL',
                    'BN',
                    customer.email,
                    html,
                    subject,
                    { type: 'EASTER_GREETING', userId: customer.id }
                );
                queuedCount++;
            }
        }

        res.json({ 
            message: 'Easter greetings queued successfully', 
            customersCount: customers.length,
            notificationsQueued: queuedCount 
        });

    } catch (error) {
        console.error('Error broadcasting Easter greetings:', error);
        res.status(500).json({ message: 'Error broadcasting Easter greetings' });
    }
};
