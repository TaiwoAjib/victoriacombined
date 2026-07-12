import express from 'express';
import { 
    getAllStylists, 
    getStylistById, 
    createStylist, 
    updateStylist, 
    deleteStylist,
    getMyStylistProfile
} from '../controllers/stylistController';
import {
    createLeave,
    getLeaves,
    deleteLeave,
    updateLeave
} from '../controllers/leaveController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes for booking flow
router.get('/', getAllStylists);
router.get('/:id', getStylistById);

// Protected Routes
router.get('/me', protect, authorize('stylist', 'admin'), getMyStylistProfile);

// Protected Admin-only routes
router.post('/', protect, authorize('admin'), createStylist);
router.put('/:id', protect, authorize('admin'), updateStylist);
router.delete('/:id', protect, authorize('admin'), deleteStylist);

// Stylist Leave Management
router.post('/:stylistId/leaves', protect, authorize('admin'), createLeave);
router.get('/:stylistId/leaves', protect, authorize('admin', 'stylist'), getLeaves);
router.put('/leaves/:id', protect, authorize('admin'), updateLeave);
router.delete('/leaves/:id', protect, authorize('admin'), deleteLeave);

export default router;
