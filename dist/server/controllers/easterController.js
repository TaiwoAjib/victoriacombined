"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastEasterGreeting = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const notificationQueueService_1 = require("../services/notificationQueueService");
const emailService_1 = require("../services/emailService");
/**
 * Broadcast Easter Greeting to all customers with notification consent (email only)
 */
const broadcastEasterGreeting = async (req, res) => {
    try {
        // Find all customers who have consented to notifications
        const customers = await prisma_1.default.user.findMany({
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
                const { subject, html } = await emailService_1.emailService.getEasterGreetingContent(customer.fullName);
                await notificationQueueService_1.notificationQueue.add('EMAIL', 'BN', customer.email, html, subject, { type: 'EASTER_GREETING', userId: customer.id });
                queuedCount++;
            }
        }
        res.json({
            message: 'Easter greetings queued successfully',
            customersCount: customers.length,
            notificationsQueued: queuedCount
        });
    }
    catch (error) {
        console.error('Error broadcasting Easter greetings:', error);
        res.status(500).json({ message: 'Error broadcasting Easter greetings' });
    }
};
exports.broadcastEasterGreeting = broadcastEasterGreeting;
