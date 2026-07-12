import express from 'express';
import { createBooking, createAdminBooking, getBookings, createPaymentIntent, updateBooking, checkInBooking } from '../controllers/bookingController';
import { authenticateToken, protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Public: Guests can book (optional auth handled inside controller or via middleware)
router.post('/', authenticateToken, createBooking); 

// Admin only: Create a manual booking without payment
router.post('/admin-create', protect, authorize('admin'), createAdminBooking);

// Payment Intent for Initial Booking (Stripe, used before booking is confirmed)
router.post('/create-payment-intent', createPaymentIntent);

// Protected: Only logged in users can view their bookings
router.get('/', protect, getBookings);

// Protected: Check-in (Customer, Admin, Stylist)
router.post('/:id/check-in', protect, checkInBooking);

// Admin/Stylist: Update booking (Assign stylist, change status)
router.patch('/:id', protect, authorize('admin', 'stylist'), updateBooking);

export default router;

