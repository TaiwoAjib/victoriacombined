import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware';
import { 
  getTemplates, 
  updateTemplate, 
  getNotificationHistory,
  getPendingApprovals,
  approveNotification,
  rejectNotification,
  updatePendingNotification
} from '../controllers/notificationSettingsController';

const router = express.Router();

router.get('/templates', protect, authorize('admin'), getTemplates);
router.put('/templates/:id', protect, authorize('admin'), updateTemplate);
router.get('/history', protect, authorize('admin'), getNotificationHistory);

// Approval workflow routes
router.get('/pending', protect, authorize('admin'), getPendingApprovals);
router.post('/pending/:id/approve', protect, authorize('admin'), approveNotification);
router.post('/pending/:id/reject', protect, authorize('admin'), rejectNotification);
router.put('/pending/:id', protect, authorize('admin'), updatePendingNotification);

export default router;
