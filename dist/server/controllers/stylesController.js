"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStylePricing = exports.getStylePricing = exports.updateStylePricing = exports.deleteStyle = exports.updateStyle = exports.createStyle = exports.getAllStyles = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
// Admin: Get all styles (formerly categories)
const getAllStyles = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }
        const [styles, total] = await Promise.all([
            prisma_1.default.style.findMany({
                where,
                include: {
                    pricing: {
                        include: {
                            category: true
                        }
                    }
                },
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
            prisma_1.default.style.count({ where })
        ]);
        res.json({
            data: styles,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching styles:', error);
        res.status(500).json({ message: 'Error fetching styles' });
    }
};
exports.getAllStyles = getAllStyles;
// Admin: Create style
const createStyle = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            res.status(400).json({ message: 'Name is required' });
            return;
        }
        const existing = await prisma_1.default.style.findUnique({
            where: { name },
        });
        if (existing) {
            if (req.file)
                fs_1.default.unlinkSync(req.file.path); // Clean up if validation fails
            res.status(400).json({ message: 'Style already exists' });
            return;
        }
        let imageUrl = null;
        if (req.file) {
            try {
                const result = await cloudinary_1.default.uploader.upload(req.file.path);
                imageUrl = result.secure_url;
                fs_1.default.unlinkSync(req.file.path); // Clean up local file
            }
            catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                // Continue without image or fail? Let's continue without image but log error
            }
        }
        const style = await prisma_1.default.style.create({
            data: { name, imageUrl },
        });
        res.status(201).json(style);
    }
    catch (error) {
        if (req.file && fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error creating style' });
    }
};
exports.createStyle = createStyle;
// Admin: Update style
const updateStyle = async (req, res) => {
    try {
        const id = req.params.id;
        const { name } = req.body;
        let imageUrl = undefined;
        if (req.file) {
            try {
                const result = await cloudinary_1.default.uploader.upload(req.file.path);
                imageUrl = result.secure_url;
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
            }
        }
        const data = { name };
        if (imageUrl) {
            data.imageUrl = imageUrl;
        }
        const style = await prisma_1.default.style.update({
            where: { id },
            data,
        });
        res.json(style);
    }
    catch (error) {
        if (req.file && fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error updating style' });
    }
};
exports.updateStyle = updateStyle;
// Admin: Delete style
const deleteStyle = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.style.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting style' });
    }
};
exports.deleteStyle = deleteStyle;
// Admin: Update Style Pricing
const updateStylePricing = async (req, res) => {
    try {
        const id = req.params.id; // styleId
        const { categoryId, price, durationMinutes } = req.body;
        if (!categoryId || !price) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        const pricing = await prisma_1.default.stylePricing.upsert({
            where: {
                styleId_categoryId: {
                    styleId: id,
                    categoryId
                }
            },
            update: {
                price,
                durationMinutes: durationMinutes || 60
            },
            create: {
                styleId: id,
                categoryId,
                price,
                durationMinutes: durationMinutes || 60
            }
        });
        res.json(pricing);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating style pricing' });
    }
};
exports.updateStylePricing = updateStylePricing;
// Admin: Get Style Pricing
const getStylePricing = async (req, res) => {
    try {
        const id = req.params.id;
        const pricing = await prisma_1.default.stylePricing.findMany({
            where: { styleId: id },
            include: { category: true }
        });
        res.json(pricing);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching pricing' });
    }
};
exports.getStylePricing = getStylePricing;
// Admin: Delete Style Pricing
const deleteStylePricing = async (req, res) => {
    try {
        const id = req.params.id; // id is styleId
        const categoryId = req.params.categoryId;
        await prisma_1.default.stylePricing.delete({
            where: {
                styleId_categoryId: {
                    styleId: id,
                    categoryId
                }
            }
        });
        res.json({ message: 'Pricing removed' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error removing pricing' });
    }
};
exports.deleteStylePricing = deleteStylePricing;
