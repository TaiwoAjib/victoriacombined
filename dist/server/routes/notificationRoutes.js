"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationController_1 = require("../controllers/notificationController");
const easterController_1 = require("../controllers/easterController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/process', notificationController_1.processNotifications);
router.get('/my-notifications', authMiddleware_1.authenticateToken, notificationController_1.getUserNotifications);
// Admin Broadcast Routes
router.post('/broadcast/easter', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorize)('admin'), easterController_1.broadcastEasterGreeting);
exports.default = router;
