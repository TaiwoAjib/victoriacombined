"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const notificationSettingsController_1 = require("../controllers/notificationSettingsController");
const router = express_1.default.Router();
router.get('/templates', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), notificationSettingsController_1.getTemplates);
router.put('/templates/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), notificationSettingsController_1.updateTemplate);
router.get('/history', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), notificationSettingsController_1.getNotificationHistory);
// Approval workflow routes
router.get('/pending', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), notificationSettingsController_1.getPendingApprovals);
router.post('/pending/:id/approve', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), notificationSettingsController_1.approveNotification);
router.post('/pending/:id/reject', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), notificationSettingsController_1.rejectNotification);
router.put('/pending/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), notificationSettingsController_1.updatePendingNotification);
exports.default = router;
