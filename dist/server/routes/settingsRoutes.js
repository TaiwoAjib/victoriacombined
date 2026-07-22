"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = __importDefault(require("../middleware/uploadMiddleware"));
const router = (0, express_1.Router)();
// Public route for reading settings (at least deposit amount and salon info)
router.get('/', settingsController_1.getSettings);
// Admin only route for updating
router.put('/', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorize)('admin'), settingsController_1.updateSettings);
// Admin only route for uploading logo
router.post('/logo', authMiddleware_1.authenticateToken, (0, authMiddleware_1.authorize)('admin'), uploadMiddleware_1.default.single('logo'), settingsController_1.uploadLogo);
exports.default = router;
