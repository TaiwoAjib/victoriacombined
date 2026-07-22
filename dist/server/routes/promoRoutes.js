"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promoController_1 = require("../controllers/promoController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/', promoController_1.getActivePromos);
// Admin routes
router.get('/admin/all', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), promoController_1.getAllPromos);
router.post('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), promoController_1.createPromo);
router.delete('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), promoController_1.deletePromo);
router.patch('/:id/status', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), promoController_1.togglePromoStatus);
exports.default = router;
