"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categoryController_1 = require("../controllers/categoryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/', categoryController_1.getAllCategories);
// Admin routes
router.get('/admin/all', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), categoryController_1.getAllAdminCategories);
router.post('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), categoryController_1.createCategory);
router.put('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), categoryController_1.updateCategory);
router.delete('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), categoryController_1.deleteCategory);
exports.default = router;
