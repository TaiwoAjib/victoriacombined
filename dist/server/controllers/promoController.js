"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.togglePromoStatus = exports.deletePromo = exports.createPromo = exports.getAllPromos = exports.getActivePromos = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Public: Get active promos
const getActivePromos = async (req, res) => {
    try {
        const promos = await prisma_1.default.monthlyPromo.findMany({
            where: {
                isActive: true,
                offerEnds: {
                    gte: new Date(), // Only future/current promos
                },
            },
            include: {
                stylePricing: {
                    include: {
                        style: true,
                        category: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(promos);
    }
    catch (error) {
        console.error('Error fetching promos:', error);
        res.status(500).json({ message: 'Error fetching promos' });
    }
};
exports.getActivePromos = getActivePromos;
// Admin: Get all promos
const getAllPromos = async (req, res) => {
    try {
        const promos = await prisma_1.default.monthlyPromo.findMany({
            include: {
                stylePricing: {
                    include: {
                        style: true,
                        category: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(promos);
    }
    catch (error) {
        console.error('Error fetching all promos:', error);
        res.status(500).json({ message: 'Error fetching all promos' });
    }
};
exports.getAllPromos = getAllPromos;
// Admin: Create promo
const createPromo = async (req, res) => {
    try {
        const { title, promoMonth, promoYear, offerEnds, stylePricingId, promoPrice, discountPercentage, promoDuration, description, terms, } = req.body;
        const promo = await prisma_1.default.monthlyPromo.create({
            data: {
                title,
                promoMonth,
                promoYear: parseInt(promoYear),
                offerEnds: new Date(offerEnds),
                stylePricingId,
                promoPrice: parseFloat(promoPrice),
                discountPercentage: discountPercentage ? parseInt(discountPercentage) : null,
                promoDuration: promoDuration ? parseInt(promoDuration) : null,
                description,
                terms,
                isActive: true,
            },
        });
        res.status(201).json(promo);
    }
    catch (error) {
        console.error('Error creating promo:', error);
        res.status(500).json({ message: 'Error creating promo' });
    }
};
exports.createPromo = createPromo;
// Admin: Delete promo
const deletePromo = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.monthlyPromo.delete({
            where: { id },
        });
        res.json({ message: 'Promo deleted' });
    }
    catch (error) {
        console.error('Error deleting promo:', error);
        res.status(500).json({ message: 'Error deleting promo' });
    }
};
exports.deletePromo = deletePromo;
// Admin: Toggle status
const togglePromoStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const promo = await prisma_1.default.monthlyPromo.findUnique({ where: { id } });
        if (!promo) {
            res.status(404).json({ message: 'Promo not found' });
            return;
        }
        const updated = await prisma_1.default.monthlyPromo.update({
            where: { id },
            data: { isActive: !promo.isActive },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error toggling promo status:', error);
        res.status(500).json({ message: 'Error toggling promo status' });
    }
};
exports.togglePromoStatus = togglePromoStatus;
