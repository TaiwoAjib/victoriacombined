"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = exports.uploadLogo = void 0;
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const DEFAULT_BUSINESS_HOURS = {
    monday: { start: "09:00", end: "22:00", isOpen: true },
    tuesday: { start: "09:00", end: "22:00", isOpen: true },
    wednesday: { start: "09:00", end: "22:00", isOpen: true },
    thursday: { start: "09:00", end: "22:00", isOpen: true },
    friday: { start: "09:00", end: "22:00", isOpen: true },
    saturday: { start: "09:00", end: "22:00", isOpen: true },
    sunday: { start: "09:00", end: "22:00", isOpen: true },
};
const uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // Upload to Cloudinary
        const result = await cloudinary_1.default.uploader.upload(req.file.path, {
            folder: 'salon-settings',
        });
        // Delete local file
        fs_1.default.unlinkSync(req.file.path);
        // Update DB
        const settings = await prisma_1.default.salonSettings.findFirst();
        if (settings) {
            const updated = await prisma_1.default.salonSettings.update({
                where: { id: settings.id },
                data: { logoUrl: result.secure_url },
            });
            res.json({ logoUrl: updated.logoUrl });
        }
        else {
            // Create new if not exists (fallback)
            const newSettings = await prisma_1.default.salonSettings.create({
                data: {
                    logoUrl: result.secure_url,
                    // Defaults for required fields will be used if defined in schema or these:
                    salonName: 'Victoria Braids & Weaves',
                    address: 'Default Address',
                    phone: '000-000-0000',
                    email: 'admin@example.com'
                },
            });
            res.json({ logoUrl: newSettings.logoUrl });
        }
    }
    catch (error) {
        console.error('Error uploading logo:', error);
        // Clean up file if error
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Error uploading logo' });
    }
};
exports.uploadLogo = uploadLogo;
const getSettings = async (req, res) => {
    try {
        const settings = await prisma_1.default.salonSettings.findFirst();
        if (!settings) {
            // Should ideally be seeded, but create default if missing
            const newSettings = await prisma_1.default.salonSettings.create({
                data: {
                    salonName: 'Victoria Braids & Weaves',
                    address: 'Salon Address, City, State',
                    phone: '+1 234 567 890',
                    email: 'admin@victoriabraids.com',
                    depositAmount: 50.00,
                    notificationsEnabled: true,
                    businessHours: DEFAULT_BUSINESS_HOURS,
                },
            });
            return res.json(newSettings);
        }
        // Ensure businessHours is present
        if (!settings.businessHours) {
            settings.businessHours = DEFAULT_BUSINESS_HOURS;
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Error fetching settings' });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const { salonName, address, phone, email, depositAmount, notificationsEnabled, requireApproval, showFaqSection, businessHours, courtesyNotice, customerModuleEnabled, timezone } = req.body;
        const settings = await prisma_1.default.salonSettings.findFirst();
        if (settings) {
            const updated = await prisma_1.default.salonSettings.update({
                where: { id: settings.id },
                data: {
                    salonName,
                    address,
                    phone,
                    email,
                    depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
                    notificationsEnabled,
                    requireApproval,
                    showFaqSection,
                    businessHours: businessHours || undefined,
                    courtesyNotice,
                    customerModuleEnabled,
                    timezone,
                },
            });
            res.json(updated);
        }
        else {
            const newSettings = await prisma_1.default.salonSettings.create({
                data: {
                    salonName,
                    address,
                    phone,
                    email,
                    depositAmount: depositAmount ? parseFloat(depositAmount) : 50.00,
                    notificationsEnabled: notificationsEnabled ?? true,
                    requireApproval: requireApproval ?? true,
                    showFaqSection: showFaqSection ?? true,
                    businessHours: businessHours || DEFAULT_BUSINESS_HOURS,
                    courtesyNotice,
                    customerModuleEnabled: customerModuleEnabled ?? true,
                    timezone: timezone || 'UTC',
                },
            });
            res.json(newSettings);
        }
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Error updating settings' });
    }
};
exports.updateSettings = updateSettings;
