"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = __importDefault(require("../middleware/uploadMiddleware"));
const router = express_1.default.Router();
// Profile Routes (Authenticated User)
router.patch('/profile', authMiddleware_1.protect, uploadMiddleware_1.default.single('profileImage'), userController_1.updateProfile);
// Admin Routes (User Management)
router.get('/customers', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), userController_1.getCustomers);
router.post('/customers', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), userController_1.createCustomer);
router.patch('/customers/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), userController_1.updateCustomer);
router.delete('/customers/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), userController_1.deleteCustomer);
exports.default = router;
