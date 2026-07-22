"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const faqController_1 = require("../controllers/faqController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public route
router.get('/public', faqController_1.getPublicFaqs);
// Admin routes
router.get('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), faqController_1.getAllFaqs);
router.post('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), faqController_1.createFaq);
router.put('/reorder', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), faqController_1.reorderFaqs);
router.put('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), faqController_1.updateFaq);
router.delete('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), faqController_1.deleteFaq);
exports.default = router;
