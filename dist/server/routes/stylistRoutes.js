"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stylistController_1 = require("../controllers/stylistController");
const leaveController_1 = require("../controllers/leaveController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes for booking flow
router.get('/', stylistController_1.getAllStylists);
router.get('/:id', stylistController_1.getStylistById);
// Protected Routes
router.get('/me', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('stylist', 'admin'), stylistController_1.getMyStylistProfile);
// Protected Admin-only routes
router.post('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), stylistController_1.createStylist);
router.put('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), stylistController_1.updateStylist);
router.delete('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), stylistController_1.deleteStylist);
// Stylist Leave Management
router.post('/:stylistId/leaves', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), leaveController_1.createLeave);
router.get('/:stylistId/leaves', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'stylist'), leaveController_1.getLeaves);
router.put('/leaves/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), leaveController_1.updateLeave);
router.delete('/leaves/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), leaveController_1.deleteLeave);
exports.default = router;
