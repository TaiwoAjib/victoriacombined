"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.getCustomers = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const cloudinary_1 = __importDefault(require("../utils/cloudinary"));
const fs_1 = __importDefault(require("fs"));
const getCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const skip = (page - 1) * limit;
        const where = { role: 'customer' };
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [customers, total] = await Promise.all([
            prisma_1.default.user.findMany({
                where,
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    address: true,
                    role: true,
                    createdAt: true,
                    profileImage: true,
                    _count: {
                        select: { bookings: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma_1.default.user.count({ where })
        ]);
        res.json({
            data: customers,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching customers' });
    }
};
exports.getCustomers = getCustomers;
const createCustomer = async (req, res) => {
    try {
        const { fullName, email, phone, address, password } = req.body;
        if (!fullName || !email || !password) {
            res.status(400).json({ message: 'Please provide all required fields' });
            return;
        }
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                fullName,
                email,
                phone,
                address,
                passwordHash,
                role: 'customer',
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
                role: true,
                createdAt: true,
                profileImage: true
            }
        });
        res.status(201).json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating customer' });
    }
};
exports.createCustomer = createCustomer;
const updateCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        const { fullName, email, phone, address, password } = req.body;
        const existingUser = await prisma_1.default.user.findUnique({ where: { id } });
        if (!existingUser) {
            res.status(404).json({ message: 'Customer not found' });
            return;
        }
        const data = {
            fullName,
            email,
            phone,
            address
        };
        if (password && password.trim() !== '') {
            data.passwordHash = await bcryptjs_1.default.hash(password, 10);
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id },
            data,
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
                role: true,
                createdAt: true,
                profileImage: true
            }
        });
        res.json(updatedUser);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating customer' });
    }
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (req, res) => {
    try {
        const id = req.params.id;
        const existingUser = await prisma_1.default.user.findUnique({ where: { id } });
        if (!existingUser) {
            res.status(404).json({ message: 'Customer not found' });
            return;
        }
        await prisma_1.default.user.delete({ where: { id } });
        res.json({ message: 'Customer deleted successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting customer' });
    }
};
exports.deleteCustomer = deleteCustomer;
// Update Profile (Self)
const updateProfile = async (req, res) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { fullName, email, phone, address, password, notificationConsent, birthDay, birthMonth } = req.body;
        let profileImageUrl = null;
        // Handle Image Upload
        if (req.file) {
            try {
                const result = await cloudinary_1.default.uploader.upload(req.file.path, {
                    folder: 'victoria-salon/profiles',
                    use_filename: true,
                });
                profileImageUrl = result.secure_url;
            }
            catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
            }
            finally {
                // Remove file from local storage
                if (fs_1.default.existsSync(req.file.path)) {
                    fs_1.default.unlinkSync(req.file.path);
                }
            }
        }
        const data = {};
        if (fullName)
            data.fullName = fullName;
        if (email)
            data.email = email;
        if (phone)
            data.phone = phone;
        if (address)
            data.address = address;
        if (profileImageUrl)
            data.profileImage = profileImageUrl;
        // Handle birthDay and birthMonth
        if (birthDay)
            data.birthDay = parseInt(birthDay.toString());
        if (birthMonth)
            data.birthMonth = parseInt(birthMonth.toString());
        if (typeof notificationConsent !== 'undefined') {
            if (notificationConsent === true || notificationConsent === 'true')
                data.notificationConsent = true;
            if (notificationConsent === false || notificationConsent === 'false')
                data.notificationConsent = false;
        }
        if (password && password.trim() !== '') {
            data.passwordHash = await bcryptjs_1.default.hash(password, 10);
        }
        const updatedUser = await prisma_1.default.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                address: true,
                role: true,
                notificationConsent: true,
                birthDay: true,
                birthMonth: true,
                profileImage: true,
                createdAt: true
            }
        });
        res.json(updatedUser);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating profile' });
    }
};
exports.updateProfile = updateProfile;
