"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryById = exports.getAllAdminCategories = exports.getAllCategories = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Public: Get all active categories (formerly services)
const getAllCategories = async (req, res) => {
    try {
        const categories = await prisma_1.default.category.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching categories' });
    }
};
exports.getAllCategories = getAllCategories;
// Admin: Get all categories (active and inactive)
const getAllAdminCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }
        const [categories, total] = await Promise.all([
            prisma_1.default.category.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: limit,
            }),
            prisma_1.default.category.count({ where })
        ]);
        res.json({
            data: categories,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching categories' });
    }
};
exports.getAllAdminCategories = getAllAdminCategories;
// Public: Get single category
const getCategoryById = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await prisma_1.default.category.findUnique({
            where: { id },
        });
        if (!category) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching category' });
    }
};
exports.getCategoryById = getCategoryById;
// Admin: Create new category
const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            res.status(400).json({ message: 'Name is required' });
            return;
        }
        const category = await prisma_1.default.category.create({
            data: { name },
        });
        res.status(201).json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating category' });
    }
};
exports.createCategory = createCategory;
// Admin: Update category
const updateCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, isActive } = req.body;
        const category = await prisma_1.default.category.update({
            where: { id },
            data: { name, isActive },
        });
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating category' });
    }
};
exports.updateCategory = updateCategory;
// Admin: Delete category
const deleteCategory = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.category.delete({
            where: { id },
        });
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting category' });
    }
};
exports.deleteCategory = deleteCategory;
