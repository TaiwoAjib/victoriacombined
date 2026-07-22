"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyStylistProfile = exports.deleteStylist = exports.updateStylist = exports.createStylist = exports.getStylistById = exports.getAllStylists = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Admin: Get all stylists
const getAllStylists = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.user = {
                OR: [
                    { fullName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ]
            };
        }
        const [stylists, total] = await Promise.all([
            prisma_1.default.stylist.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true,
                            address: true,
                            role: true,
                            createdAt: true,
                        }
                    },
                    styles: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.default.stylist.count({ where })
        ]);
        // Flatten the response for easier frontend consumption
        const formattedStylists = stylists.map(stylist => ({
            id: stylist.id,
            userId: stylist.userId,
            fullName: stylist.user.fullName,
            email: stylist.user.email,
            phone: stylist.user.phone,
            address: stylist.user.address,
            skillLevel: stylist.skillLevel,
            surcharge: stylist.surcharge,
            styleSurcharges: stylist.styleSurcharges,
            workingHours: stylist.workingHours,
            isActive: stylist.isActive,
            createdAt: stylist.createdAt,
            styles: stylist.styles || []
        }));
        res.json({
            data: formattedStylists,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching stylists' });
    }
};
exports.getAllStylists = getAllStylists;
// Admin: Get single stylist
const getStylistById = async (req, res) => {
    try {
        const id = req.params.id;
        const stylist = await prisma_1.default.stylist.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        address: true,
                        role: true,
                    }
                },
                styles: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        if (!stylist) {
            res.status(404).json({ message: 'Stylist not found' });
            return;
        }
        res.json({
            id: stylist.id,
            userId: stylist.userId,
            fullName: stylist.user.fullName,
            email: stylist.user.email,
            phone: stylist.user.phone,
            address: stylist.user.address,
            skillLevel: stylist.skillLevel,
            surcharge: stylist.surcharge,
            styleSurcharges: stylist.styleSurcharges,
            workingHours: stylist.workingHours,
            isActive: stylist.isActive,
            styles: stylist.styles || []
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching stylist' });
    }
};
exports.getStylistById = getStylistById;
// Admin: Create stylist
const createStylist = async (req, res) => {
    try {
        const { fullName, email, password, phone, address, skillLevel, surcharge, styleIds, workingHours } = req.body;
        // Check if user exists
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'User with this email already exists' });
            return;
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password || 'password123', 10);
        // Create user and stylist in transaction
        const result = await prisma_1.default.$transaction(async (prisma) => {
            const user = await prisma.user.create({
                data: {
                    fullName,
                    email,
                    passwordHash: hashedPassword,
                    phone,
                    address,
                    role: 'stylist',
                }
            });
            const stylist = await prisma.stylist.create({
                data: {
                    userId: user.id,
                    skillLevel,
                    surcharge: surcharge ? parseFloat(surcharge) : 0,
                    workingHours: workingHours || undefined,
                    isActive: true,
                    styles: styleIds ? {
                        connect: styleIds.map((id) => ({ id }))
                    } : undefined
                }
            });
            return stylist;
        });
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Create stylist error:', error);
        res.status(500).json({ message: 'Error creating stylist' });
    }
};
exports.createStylist = createStylist;
// Admin: Update stylist
const updateStylist = async (req, res) => {
    try {
        const id = req.params.id;
        const { fullName, email, password, phone, address, skillLevel, surcharge, styleSurcharges, isActive, styleIds, workingHours } = req.body;
        const stylist = await prisma_1.default.stylist.findUnique({ where: { id } });
        if (!stylist) {
            res.status(404).json({ message: 'Stylist not found' });
            return;
        }
        // Update user and stylist in transaction
        await prisma_1.default.$transaction(async (prisma) => {
            // Update User fields
            const userUpdateData = {
                fullName,
                email,
                phone,
                address,
            };
            if (password) {
                userUpdateData.passwordHash = await bcryptjs_1.default.hash(password, 10);
            }
            await prisma.user.update({
                where: { id: stylist.userId },
                data: userUpdateData
            });
            // Update Stylist fields
            await prisma.stylist.update({
                where: { id },
                data: {
                    skillLevel,
                    surcharge: surcharge !== undefined ? parseFloat(surcharge) : undefined,
                    styleSurcharges: styleSurcharges || undefined,
                    workingHours: workingHours || undefined,
                    isActive: isActive,
                    styles: styleIds ? {
                        set: [], // Clear existing
                        connect: styleIds.map((sid) => ({ id: sid }))
                    } : undefined
                }
            });
        });
        res.json({ message: 'Stylist updated successfully' });
    }
    catch (error) {
        console.error('Update stylist error:', error);
        res.status(500).json({ message: 'Error updating stylist' });
    }
};
exports.updateStylist = updateStylist;
// Admin: Delete stylist
const deleteStylist = async (req, res) => {
    try {
        const id = req.params.id;
        // Check if stylist exists
        const stylist = await prisma_1.default.stylist.findUnique({
            where: { id },
            include: { bookings: true } // Check for dependencies
        });
        if (!stylist) {
            res.status(404).json({ message: 'Stylist not found' });
            return;
        }
        // If stylist has bookings, maybe just deactivate instead of delete?
        // For now, let's hard delete but wrapped in transaction to delete user too if needed
        // Or just delete the stylist profile and keep the user as a regular user?
        // Let's delete both for cleanup, but strictly only if no future bookings exist?
        // For simplicity per user request "delete", we will delete the stylist record.
        // The user record might be kept or deleted. Let's delete the stylist record first.
        await prisma_1.default.$transaction(async (prisma) => {
            // Disconnect styles
            await prisma.stylist.update({
                where: { id },
                data: { styles: { set: [] } }
            });
            // Delete stylist profile
            await prisma.stylist.delete({
                where: { id }
            });
            // Optionally delete the user account if they are only a stylist?
            // Let's keep the user account for now to be safe, or maybe change role to USER.
            await prisma.user.update({
                where: { id: stylist.userId },
                data: { role: 'customer' }
            });
        });
        res.json({ message: 'Stylist deleted successfully' });
    }
    catch (error) {
        console.error('Delete stylist error:', error);
        // Prisma error code for constraint violation is P2003
        if (error.code === 'P2003') {
            res.status(400).json({ message: 'Cannot delete stylist with existing bookings' });
        }
        else {
            res.status(500).json({ message: 'Error deleting stylist' });
        }
    }
};
exports.deleteStylist = deleteStylist;
// Get current logged-in stylist profile
const getMyStylistProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const stylist = await prisma_1.default.stylist.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        fullName: true,
                        email: true,
                        phone: true
                    }
                },
                styles: true
            }
        });
        if (!stylist) {
            res.status(404).json({ message: 'Stylist profile not found' });
            return;
        }
        res.json(stylist);
    }
    catch (error) {
        console.error('Get my stylist profile error:', error);
        res.status(500).json({ message: 'Error fetching stylist profile' });
    }
};
exports.getMyStylistProfile = getMyStylistProfile;
