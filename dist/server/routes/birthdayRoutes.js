"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const birthdayController_1 = require("../controllers/birthdayController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Only admin should access birthday module
router.get('/upcoming', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), birthdayController_1.getUpcomingBirthdays);
router.post('/greet', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), birthdayController_1.sendBirthdayGreeting);
exports.default = router;
