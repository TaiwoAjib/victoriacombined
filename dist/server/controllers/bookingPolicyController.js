"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookingPolicy = exports.getBookingPolicy = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getBookingPolicy = async (req, res) => {
    try {
        const policy = await prisma_1.default.bookingPolicy.findFirst({
            where: { isActive: true },
        });
        res.json(policy);
    }
    catch (error) {
        console.error('Error fetching booking policy:', error);
        res.status(500).json({ error: 'Failed to fetch booking policy' });
    }
};
exports.getBookingPolicy = getBookingPolicy;
const updateBookingPolicy = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        // Update the first active policy or create one if none exists
        const existingPolicy = await prisma_1.default.bookingPolicy.findFirst();
        if (existingPolicy) {
            const updatedPolicy = await prisma_1.default.bookingPolicy.update({
                where: { id: existingPolicy.id },
                data: { content },
            });
            res.json(updatedPolicy);
        }
        else {
            const newPolicy = await prisma_1.default.bookingPolicy.create({
                data: { content, isActive: true },
            });
            res.json(newPolicy);
        }
    }
    catch (error) {
        console.error('Error updating booking policy:', error);
        res.status(500).json({ error: 'Failed to update booking policy' });
    }
};
exports.updateBookingPolicy = updateBookingPolicy;
