"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingPolicyController_1 = require("../controllers/bookingPolicyController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public route to get the policy
router.get('/', bookingPolicyController_1.getBookingPolicy);
// Admin route to update the policy
router.put('/', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), bookingPolicyController_1.updateBookingPolicy);
exports.default = router;
