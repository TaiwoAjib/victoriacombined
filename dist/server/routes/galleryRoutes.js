"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const galleryController_1 = require("../controllers/galleryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = __importDefault(require("../middleware/uploadMiddleware"));
const router = (0, express_1.Router)();
// Public routes
router.get('/', galleryController_1.getGalleryItems);
// Admin routes
router.post('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), uploadMiddleware_1.default.single('image'), galleryController_1.createGalleryItem);
router.put('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), uploadMiddleware_1.default.single('image'), galleryController_1.updateGalleryItem);
router.delete('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), galleryController_1.deleteGalleryItem);
exports.default = router;
