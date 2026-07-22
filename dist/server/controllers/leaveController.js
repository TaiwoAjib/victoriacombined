"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLeave = exports.deleteLeave = exports.getLeaves = exports.createLeave = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Add leave for a stylist
const createLeave = async (req, res) => {
    try {
        const stylistId = req.params.stylistId;
        const { startDate, endDate, reason } = req.body;
        if (!startDate || !endDate) {
            res.status(400).json({ message: 'Start date and end date are required' });
            return;
        }
        // Ensure dates are stored as UTC dates (midnight)
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Simple validation
        if (start > end) {
            res.status(400).json({ message: 'Start date cannot be after end date' });
            return;
        }
        const leave = await prisma_1.default.stylistLeave.create({
            data: {
                stylistId,
                startDate: start,
                endDate: end,
                reason
            }
        });
        res.status(201).json(leave);
    }
    catch (error) {
        console.error('Error creating leave:', error);
        res.status(500).json({ message: 'Failed to create leave record' });
    }
};
exports.createLeave = createLeave;
// Get leaves for a stylist
const getLeaves = async (req, res) => {
    try {
        const stylistId = req.params.stylistId;
        const userRole = req.user?.role;
        const userId = req.user?.id;
        // Allow Admin or the Stylist themselves
        if (userRole !== 'admin') {
            const stylist = await prisma_1.default.stylist.findUnique({ where: { id: stylistId } });
            if (!stylist || stylist.userId !== userId) {
                res.status(403).json({ message: 'Not authorized to view these leaves' });
                return;
            }
        }
        const leaves = await prisma_1.default.stylistLeave.findMany({
            where: { stylistId },
            orderBy: { startDate: 'desc' }
        });
        res.json(leaves);
    }
    catch (error) {
        console.error('Error fetching leaves:', error);
        res.status(500).json({ message: 'Failed to fetch leave records' });
    }
};
exports.getLeaves = getLeaves;
// Delete a leave
const deleteLeave = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.stylistLeave.delete({
            where: { id }
        });
        res.status(200).json({ message: 'Leave record deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting leave:', error);
        res.status(500).json({ message: 'Failed to delete leave record' });
    }
};
exports.deleteLeave = deleteLeave;
// Update a leave
const updateLeave = async (req, res) => {
    try {
        const id = req.params.id;
        const { startDate, endDate, reason } = req.body;
        if (!startDate || !endDate) {
            res.status(400).json({ message: 'Start date and end date are required' });
            return;
        }
        // Ensure dates are stored as UTC dates (midnight)
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Simple validation
        if (start > end) {
            res.status(400).json({ message: 'Start date cannot be after end date' });
            return;
        }
        const leave = await prisma_1.default.stylistLeave.update({
            where: { id },
            data: {
                startDate: start,
                endDate: end,
                reason
            }
        });
        res.status(200).json(leave);
    }
    catch (error) {
        console.error('Error updating leave:', error);
        res.status(500).json({ message: 'Failed to update leave record' });
    }
};
exports.updateLeave = updateLeave;
