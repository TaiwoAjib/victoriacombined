"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reportsController_1 = require("../controllers/reportsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All reports routes are protected and admin-only
router.use(authMiddleware_1.protect);
router.use((0, authMiddleware_1.authorize)('admin'));
router.get('/dashboard-stats', reportsController_1.getDashboardStats);
router.get('/revenue', reportsController_1.getRevenueStats);
router.get('/services', reportsController_1.getServiceStats);
router.get('/categories', reportsController_1.getCategoryStats);
router.get('/stylists', reportsController_1.getStylistStats);
exports.default = router;
