"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stylesController_1 = require("../controllers/stylesController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = __importDefault(require("../middleware/uploadMiddleware"));
const router = (0, express_1.Router)();
// Public routes
router.get('/', stylesController_1.getAllStyles);
// Admin routes
router.post('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), uploadMiddleware_1.default.single('image'), stylesController_1.createStyle);
router.put('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), uploadMiddleware_1.default.single('image'), stylesController_1.updateStyle);
router.delete('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), stylesController_1.deleteStyle);
router.put('/:id/pricing', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), stylesController_1.updateStylePricing);
router.delete('/:id/pricing/:categoryId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), stylesController_1.deleteStylePricing);
exports.default = router;
