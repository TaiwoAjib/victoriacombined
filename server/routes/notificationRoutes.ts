import express from 'express';
import { processNotifications, getUserNotifications } from '../controllers/notificationController';
import { broadcastEasterGreeting } from '../controllers/easterController';
import { authenticateToken, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/process', processNotifications);
router.get('/my-notifications', authenticateToken, getUserNotifications);

// Admin Broadcast Routes
router.post('/broadcast/easter', authenticateToken, authorize('admin'), broadcastEasterGreeting);

export default router;
