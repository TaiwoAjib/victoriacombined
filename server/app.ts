import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/authRoutes';
import stylesRoutes from './routes/stylesRoutes';
import categoryRoutes from './routes/categoryRoutes';
import bookingRoutes from './routes/bookingRoutes';
import availabilityRoutes from './routes/availabilityRoutes';
import stylistRoutes from './routes/stylistRoutes';
import userRoutes from './routes/userRoutes';
import settingsRoutes from './routes/settingsRoutes';
import reportsRoutes from './routes/reportsRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import notificationRoutes from './routes/notificationRoutes';
import notificationSettingsRoutes from './routes/notificationSettingsRoutes';
import birthdayRoutes from './routes/birthdayRoutes';
import faqRoutes from './routes/faqRoutes';
import bookingPolicyRoutes from './routes/bookingPolicyRoutes';
import galleryRoutes from './routes/galleryRoutes';
import promoRoutes from './routes/promoRoutes';
import cron from 'node-cron';
import { reminderService } from './services/reminderService';

// Load environment variables
dotenv.config();

const app = express();

// Disable ETag to prevent 304 Not Modified responses
app.set('etag', false);

// Middleware
app.use(express.json());
app.use(cors());
// CSP disabled: the frontend is served from this same server and loads
// third-party resources (Stripe JS, Cloudinary images) that a default CSP would block
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/styles', stylesRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/stylists', stylistRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/chat', chatbotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/birthdays', birthdayRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/booking-policy', bookingPolicyRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/notification-settings', notificationSettingsRoutes);

// Serve the built frontend when it exists (single-solution deployment).
// __dirname is dist/server when compiled, server/ under ts-node-dev.
const clientDist = [
  path.resolve(__dirname, '../client'),
  path.resolve(__dirname, '../dist/client'),
].find((p) => fs.existsSync(path.join(p, 'index.html')));

if (clientDist) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-API route serves index.html
  app.get(/^(?!\/api($|\/)).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Victoria Salon API is running');
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Schedule Reminder Job (Every hour at minute 0)
export const scheduleReminders = () => {
  cron.schedule('0 * * * *', () => {
    console.log('Running scheduled reminder check...');
    reminderService.checkAndSendReminders();
  });
};

// Startup diagnostic: verify the database is actually reachable from this
// host and log an unambiguous result, so deploy logs show immediately
// whether DB connectivity (not application logic) is the problem.
export const verifyDatabaseConnection = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[db-check] DATABASE_URL is NOT set — no database connection is possible');
    return;
  }
  const host = url.match(/@([^/?]+)/)?.[1] ?? 'unknown-host';
  try {
    const prisma = (await import('./utils/prisma')).default;
    await prisma.$queryRaw`SELECT 1`;
    console.log(`[db-check] OK — database reachable at ${host}`);
  } catch (error: any) {
    console.error(
      `[db-check] FAILED — cannot query database at ${host}: ` +
      `${error?.name ?? 'Error'} ${error?.code ?? ''} ${error?.message?.split('\n').pop() ?? ''}`
    );
  }
};

export default app;
