"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePendingNotification = exports.rejectNotification = exports.approveNotification = exports.getPendingApprovals = exports.getNotificationHistory = exports.updateTemplate = exports.getTemplates = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Get all templates
const getTemplates = async (req, res) => {
    try {
        const templates = await prisma_1.default.notificationTemplate.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(templates);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching templates', error });
    }
};
exports.getTemplates = getTemplates;
// Update a template
const updateTemplate = async (req, res) => {
    const id = req.params.id;
    const { subject, content, isActive } = req.body;
    try {
        const template = await prisma_1.default.notificationTemplate.update({
            where: { id },
            data: {
                subject,
                content,
                isActive
            }
        });
        res.json(template);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating template', error });
    }
};
exports.updateTemplate = updateTemplate;
// Get notification history
const getNotificationHistory = async (req, res) => {
    try {
        const history = await prisma_1.default.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to last 100 for now
        });
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching notification history', error });
    }
};
exports.getNotificationHistory = getNotificationHistory;
// Get notifications waiting for approval
const getPendingApprovals = async (req, res) => {
    try {
        const notifications = await prisma_1.default.notification.findMany({
            where: { status: 'WAITING_APPROVAL' },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notifications);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching pending approvals', error });
    }
};
exports.getPendingApprovals = getPendingApprovals;
// Approve a notification (move to PENDING queue)
const approveNotification = async (req, res) => {
    const id = req.params.id;
    try {
        const notification = await prisma_1.default.notification.update({
            where: { id },
            data: { status: 'PENDING' }
        });
        res.json(notification);
    }
    catch (error) {
        res.status(500).json({ message: 'Error approving notification', error });
    }
};
exports.approveNotification = approveNotification;
// Reject a notification
const rejectNotification = async (req, res) => {
    const id = req.params.id;
    try {
        const notification = await prisma_1.default.notification.update({
            where: { id },
            data: { status: 'REJECTED' }
        });
        res.json(notification);
    }
    catch (error) {
        res.status(500).json({ message: 'Error rejecting notification', error });
    }
};
exports.rejectNotification = rejectNotification;
// Update a pending notification
const updatePendingNotification = async (req, res) => {
    const id = req.params.id;
    const { subject, content } = req.body;
    try {
        const notification = await prisma_1.default.notification.update({
            where: { id },
            data: { subject, content }
        });
        res.json(notification);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating notification', error });
    }
};
exports.updatePendingNotification = updatePendingNotification;
