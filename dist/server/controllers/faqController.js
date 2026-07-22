"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderFaqs = exports.deleteFaq = exports.updateFaq = exports.createFaq = exports.getAllFaqs = exports.getPublicFaqs = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getPublicFaqs = async (req, res) => {
    try {
        const faqs = await prisma_1.default.faq.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });
        res.json(faqs);
    }
    catch (error) {
        console.error('Error fetching public FAQs:', error);
        res.status(500).json({ message: 'Error fetching FAQs' });
    }
};
exports.getPublicFaqs = getPublicFaqs;
const getAllFaqs = async (req, res) => {
    try {
        const faqs = await prisma_1.default.faq.findMany({
            orderBy: { order: 'asc' }
        });
        res.json(faqs);
    }
    catch (error) {
        console.error('Error fetching FAQs:', error);
        res.status(500).json({ message: 'Error fetching FAQs' });
    }
};
exports.getAllFaqs = getAllFaqs;
const createFaq = async (req, res) => {
    try {
        const { question, answer, order, isActive } = req.body;
        // Get max order if not provided
        let newOrder = order;
        if (newOrder === undefined) {
            const maxOrderFaq = await prisma_1.default.faq.findFirst({
                orderBy: { order: 'desc' }
            });
            newOrder = (maxOrderFaq?.order || 0) + 1;
        }
        const faq = await prisma_1.default.faq.create({
            data: {
                question,
                answer,
                order: newOrder,
                isActive: isActive !== undefined ? isActive : true
            }
        });
        res.json(faq);
    }
    catch (error) {
        console.error('Error creating FAQ:', error);
        res.status(500).json({ message: 'Error creating FAQ' });
    }
};
exports.createFaq = createFaq;
const updateFaq = async (req, res) => {
    try {
        const id = req.params.id;
        const { question, answer, order, isActive } = req.body;
        const faq = await prisma_1.default.faq.update({
            where: { id },
            data: {
                question,
                answer,
                order,
                isActive
            }
        });
        res.json(faq);
    }
    catch (error) {
        console.error('Error updating FAQ:', error);
        res.status(500).json({ message: 'Error updating FAQ' });
    }
};
exports.updateFaq = updateFaq;
const deleteFaq = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.faq.delete({
            where: { id }
        });
        res.json({ message: 'FAQ deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting FAQ:', error);
        res.status(500).json({ message: 'Error deleting FAQ' });
    }
};
exports.deleteFaq = deleteFaq;
const reorderFaqs = async (req, res) => {
    try {
        const { orderedIds } = req.body; // Array of IDs in new order
        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }
        // Use transaction to update all
        await prisma_1.default.$transaction(orderedIds.map((id, index) => prisma_1.default.faq.update({
            where: { id },
            data: { order: index + 1 }
        })));
        res.json({ message: 'FAQs reordered successfully' });
    }
    catch (error) {
        console.error('Error reordering FAQs:', error);
        res.status(500).json({ message: 'Error reordering FAQs' });
    }
};
exports.reorderFaqs = reorderFaqs;
