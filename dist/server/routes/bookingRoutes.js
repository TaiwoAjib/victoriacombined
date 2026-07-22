"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bookingController_1 = require("../controllers/bookingController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public: Guests can book (optional auth handled inside controller or via middleware)
router.post('/', authMiddleware_1.authenticateToken, bookingController_1.createBooking);
// Admin only: Create a manual booking without payment
router.post('/admin-create', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin'), bookingController_1.createAdminBooking);
// Payment Intent for Initial Booking (Stripe, used before booking is confirmed)
router.post('/create-payment-intent', bookingController_1.createPaymentIntent);
// Protected: Only logged in users can view their bookings
router.get('/', authMiddleware_1.protect, bookingController_1.getBookings);
// Protected: Check-in (Customer, Admin, Stylist)
router.post('/:id/check-in', authMiddleware_1.protect, bookingController_1.checkInBooking);
// Admin/Stylist: Update booking (Assign stylist, change status)
router.patch('/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('admin', 'stylist'), bookingController_1.updateBooking);
exports.default = router;
