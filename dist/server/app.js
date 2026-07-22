"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDatabaseConnection = exports.scheduleReminders = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const stylesRoutes_1 = __importDefault(require("./routes/stylesRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const availabilityRoutes_1 = __importDefault(require("./routes/availabilityRoutes"));
const stylistRoutes_1 = __importDefault(require("./routes/stylistRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const reportsRoutes_1 = __importDefault(require("./routes/reportsRoutes"));
const chatbotRoutes_1 = __importDefault(require("./routes/chatbotRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const notificationSettingsRoutes_1 = __importDefault(require("./routes/notificationSettingsRoutes"));
const birthdayRoutes_1 = __importDefault(require("./routes/birthdayRoutes"));
const faqRoutes_1 = __importDefault(require("./routes/faqRoutes"));
const bookingPolicyRoutes_1 = __importDefault(require("./routes/bookingPolicyRoutes"));
const galleryRoutes_1 = __importDefault(require("./routes/galleryRoutes"));
const promoRoutes_1 = __importDefault(require("./routes/promoRoutes"));
const node_cron_1 = __importDefault(require("node-cron"));
const reminderService_1 = require("./services/reminderService");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Disable ETag to prevent 304 Not Modified responses
app.set('etag', false);
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// CSP disabled: the frontend is served from this same server and loads
// third-party resources (Stripe JS, Cloudinary images) that a default CSP would block
app.use((0, helmet_1.default)({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use((0, morgan_1.default)('dev'));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/styles', stylesRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/availability', availabilityRoutes_1.default);
app.use('/api/stylists', stylistRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
app.use('/api/reports', reportsRoutes_1.default);
app.use('/api/chat', chatbotRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/birthdays', birthdayRoutes_1.default);
app.use('/api/faqs', faqRoutes_1.default);
app.use('/api/booking-policy', bookingPolicyRoutes_1.default);
app.use('/api/gallery', galleryRoutes_1.default);
app.use('/api/promos', promoRoutes_1.default);
app.use('/api/notification-settings', notificationSettingsRoutes_1.default);
// Serve the built frontend when it exists (single-solution deployment).
// __dirname is dist/server when compiled, server/ under ts-node-dev.
const clientDist = [
    path_1.default.resolve(__dirname, '../client'),
    path_1.default.resolve(__dirname, '../dist/client'),
].find((p) => fs_1.default.existsSync(path_1.default.join(p, 'index.html')));
if (clientDist) {
    app.use(express_1.default.static(clientDist));
    // SPA fallback: any non-API route serves index.html
    app.get(/^(?!\/api($|\/)).*/, (req, res) => {
        res.sendFile(path_1.default.join(clientDist, 'index.html'));
    });
}
else {
    app.get('/', (req, res) => {
        res.send('Victoria Salon API is running');
    });
}
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
// Schedule Reminder Job (Every hour at minute 0)
const scheduleReminders = () => {
    node_cron_1.default.schedule('0 * * * *', () => {
        console.log('Running scheduled reminder check...');
        reminderService_1.reminderService.checkAndSendReminders();
    });
};
exports.scheduleReminders = scheduleReminders;
// Startup diagnostic: verify the database is actually reachable from this
// host and log an unambiguous result, so deploy logs show immediately
// whether DB connectivity (not application logic) is the problem.
const verifyDatabaseConnection = async () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('[db-check] DATABASE_URL is NOT set — no database connection is possible');
        return;
    }
    const host = url.match(/@([^/?]+)/)?.[1] ?? 'unknown-host';
    try {
        const prisma = (await Promise.resolve().then(() => __importStar(require('./utils/prisma')))).default;
        await prisma.$queryRaw `SELECT 1`;
        console.log(`[db-check] OK — database reachable at ${host}`);
    }
    catch (error) {
        console.error(`[db-check] FAILED — cannot query database at ${host}: ` +
            `${error?.name ?? 'Error'} ${error?.code ?? ''} ${error?.message?.split('\n').pop() ?? ''}`);
    }
};
exports.verifyDatabaseConnection = verifyDatabaseConnection;
exports.default = app;
