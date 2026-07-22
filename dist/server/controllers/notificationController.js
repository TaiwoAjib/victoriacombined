"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserNotifications = exports.processNotifications = void 0;
const notificationQueueService_1 = require("../services/notificationQueueService");
const prisma_1 = __importDefault(require("../utils/prisma"));
const processNotifications = async (req, res) => {
    try {
        // Simple security check (should ideally use a proper middleware or API key)
        const apiKey = req.headers['x-api-key'];
        const validKey = process.env.CRON_SECRET || 'dev_cron_secret';
        if (apiKey !== validKey) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const result = await notificationQueueService_1.notificationQueue.processQueue();
        res.json({ message: 'Queue processed', ...result });
    }
    catch (error) {
        console.error('Error processing notification queue:', error);
        res.status(500).json({ message: 'Error processing queue' });
    }
};
exports.processNotifications = processNotifications;
/**
 * Get notifications for the logged-in user (Customer)
 */
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        // Find user to get email/phone
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Fetch notifications where recipient matches user email or phone
        // We only show SENT notifications to the customer
        const notifications = await prisma_1.default.notification.findMany({
            where: {
                OR: [
                    { recipient: user.email },
                    { recipient: user.phone || '' }
                ],
                status: 'SENT'
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50
        });
        res.json(notifications);
    }
    catch (error) {
        console.error('Error fetching user notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};
exports.getUserNotifications = getUserNotifications;
