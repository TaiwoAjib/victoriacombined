"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGalleryItem = exports.updateGalleryItem = exports.createGalleryItem = exports.getGalleryItems = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
// Public: Get all gallery items
const getGalleryItems = async (req, res) => {
    try {
        const items = await prisma_1.default.galleryItem.findMany({
            orderBy: { order: 'asc' },
        });
        res.json(items);
    }
    catch (error) {
        console.error('Error fetching gallery items:', error);
        res.status(500).json({ message: 'Error fetching gallery items' });
    }
};
exports.getGalleryItems = getGalleryItems;
// Admin: Create gallery item
const createGalleryItem = async (req, res) => {
    try {
        const { title, category, order } = req.body;
        if (!title || !category || !req.file) {
            if (req.file)
                fs_1.default.unlinkSync(req.file.path);
            res.status(400).json({ message: 'Title, category, and image are required' });
            return;
        }
        let imageUrl = '';
        try {
            const result = await cloudinary_1.default.uploader.upload(req.file.path);
            imageUrl = result.secure_url;
            fs_1.default.unlinkSync(req.file.path);
        }
        catch (uploadError) {
            console.error('Cloudinary upload error:', uploadError);
            res.status(500).json({ message: 'Image upload failed' });
            return;
        }
        const item = await prisma_1.default.galleryItem.create({
            data: {
                title,
                category,
                imageUrl,
                order: order ? parseInt(order) : 0,
            },
        });
        res.status(201).json(item);
    }
    catch (error) {
        console.error('Error creating gallery item:', error);
        if (req.file && fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error creating gallery item' });
    }
};
exports.createGalleryItem = createGalleryItem;
// Admin: Update gallery item
const updateGalleryItem = async (req, res) => {
    try {
        const id = req.params.id;
        const { title, category, order } = req.body;
        let imageUrl = undefined;
        if (req.file) {
            try {
                const result = await cloudinary_1.default.uploader.upload(req.file.path);
                imageUrl = result.secure_url;
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                res.status(500).json({ message: 'Image upload failed' });
                return;
            }
        }
        const data = {};
        if (title)
            data.title = title;
        if (category)
            data.category = category;
        if (order !== undefined)
            data.order = parseInt(order);
        if (imageUrl)
            data.imageUrl = imageUrl;
        const item = await prisma_1.default.galleryItem.update({
            where: { id },
            data,
        });
        res.json(item);
    }
    catch (error) {
        console.error('Error updating gallery item:', error);
        if (req.file && fs_1.default.existsSync(req.file.path))
            fs_1.default.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error updating gallery item' });
    }
};
exports.updateGalleryItem = updateGalleryItem;
// Admin: Delete gallery item
const deleteGalleryItem = async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.galleryItem.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting gallery item:', error);
        res.status(500).json({ message: 'Error deleting gallery item' });
    }
};
exports.deleteGalleryItem = deleteGalleryItem;
