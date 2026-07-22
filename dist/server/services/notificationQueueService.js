"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationQueue = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const emailService_1 = require("./emailService");
const smsService_1 = require("./smsService");
exports.notificationQueue = {
    /**
     * Add a notification to the queue
     */
    add: async (channel, type, recipient, content, subject, metadata) => {
        try {
            // Check if approval is required
            const settings = await prisma_1.default.salonSettings.findFirst();
            const requireApproval = settings?.requireApproval ?? true;
            const initialStatus = requireApproval ? 'WAITING_APPROVAL' : 'PENDING';
            await prisma_1.default.notification.create({
                data: {
                    channel,
                    type,
                    recipient,
                    content,
                    subject,
                    metadata: metadata || {},
                    status: initialStatus
                }
            });
            console.log(`[Queue] Added ${channel} notification (${type}) for ${recipient} (Status: ${initialStatus})`);
        }
        catch (error) {
            console.error('Error adding notification to queue:', error);
            // In a robust system, we might want to alert admins here
        }
    },
    /**
     * Process pending notifications
     */
    processQueue: async (limit = 20) => {
        // Fetch pending notifications
        const pending = await prisma_1.default.notification.findMany({
            where: {
                status: 'PENDING',
                retryCount: { lt: 3 }
            },
            take: limit,
            orderBy: { createdAt: 'asc' }
        });
        if (pending.length === 0) {
            return { processed: 0, errors: 0 };
        }
        console.log(`[Queue] Processing ${pending.length} notifications...`);
        let processedCount = 0;
        let errorCount = 0;
        for (const notification of pending) {
            try {
                if (notification.channel === 'EMAIL') {
                    if (!notification.subject)
                        throw new Error('Email subject missing');
                    await emailService_1.emailService.sendEmail(notification.recipient, notification.subject, notification.content);
                }
                else if (notification.channel === 'SMS') {
                    await smsService_1.smsService.sendSms(notification.recipient, notification.content);
                }
                // Mark as SENT
                await prisma_1.default.notification.update({
                    where: { id: notification.id },
                    data: {
                        status: 'SENT',
                        sentAt: new Date()
                    }
                });
                processedCount++;
            }
            catch (error) {
                console.error(`[Queue] Failed to process notification ${notification.id}:`, error);
                errorCount++;
                // Increment retry count or mark FAILED
                const retryCount = notification.retryCount + 1;
                const status = retryCount >= 3 ? 'FAILED' : 'PENDING';
                await prisma_1.default.notification.update({
                    where: { id: notification.id },
                    data: {
                        retryCount,
                        status
                    }
                });
            }
        }
        return { processed: processedCount, errors: errorCount };
    }
};
