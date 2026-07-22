"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAvailability = exports.getAvailability = void 0;
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
/** Parse "HH:mm" into total minutes since midnight */
const parseTimeToMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
};
const getAvailability = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const { date, startDate, endDate, categoryId, styleId, stylistId, duration, excludeBookingId } = req.query;
        let start;
        let end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        }
        else if (date) {
            start = new Date(date);
            end = new Date(date);
        }
        else {
            res.status(400).json({ message: 'Date or startDate/endDate is required' });
            return;
        }
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            res.status(400).json({ message: 'Invalid date format' });
            return;
        }
        /* ---------------------------------------------------------
           1. GET STYLE INFORMATION (duration)
        --------------------------------------------------------- */
        let requestedDuration = duration ? parseInt(duration) : 0;
        if (!requestedDuration && styleId && categoryId) {
            const stylePricing = await prisma_1.default.stylePricing.findFirst({
                where: {
                    styleId: styleId,
                    categoryId: categoryId
                }
            });
            if (stylePricing) {
                requestedDuration = stylePricing.durationMinutes;
            }
        }
        if (!requestedDuration)
            requestedDuration = 60;
        /* ---------------------------------------------------------
           2. GET STYLIST(S)
           A stylist is optional: bookings can be made without one (the admin
           assigns later), so without a stylistId we compute availability
           across every active stylist that offers the selected style.
        --------------------------------------------------------- */
        let activeStylists = [];
        const stylistSelect = {
            id: true,
            workingHours: true,
            user: { select: { fullName: true } },
            leaves: {
                where: {
                    startDate: { lte: end },
                    endDate: { gte: start }
                }
            }
        };
        if (stylistId) {
            const stylist = await prisma_1.default.stylist.findFirst({
                where: {
                    id: stylistId,
                    isActive: true,
                    ...(styleId ? { styles: { some: { id: styleId } } } : {})
                },
                select: stylistSelect
            });
            if (!stylist) {
                res.status(404).json({
                    message: 'Selected stylist not found or inactive'
                });
                return;
            }
            activeStylists = [stylist];
        }
        else {
            activeStylists = await prisma_1.default.stylist.findMany({
                where: {
                    isActive: true,
                    ...(styleId ? { styles: { some: { id: styleId } } } : {})
                },
                select: stylistSelect
            });
        }
        /* ---------------------------------------------------------
           3. GET EXISTING BOOKINGS
           Fix B2: For date-range queries we use gte/lte across the range.
           For a single-date query we scope bookings to that exact calendar date
           by computing the start-of-day and end-of-day in UTC.
        --------------------------------------------------------- */
        // Build exclusive date window covering every day in [start, end]
        const bookingWindowStart = new Date(start);
        bookingWindowStart.setUTCHours(0, 0, 0, 0);
        const bookingWindowEnd = new Date(end);
        bookingWindowEnd.setUTCHours(23, 59, 59, 999);
        const bookings = await prisma_1.default.booking.findMany({
            where: {
                bookingDate: {
                    gte: bookingWindowStart,
                    lte: bookingWindowEnd
                },
                status: { notIn: ['cancelled'] },
                ...(excludeBookingId ? { id: { not: excludeBookingId } } : {})
            },
            select: {
                id: true,
                bookingDate: true,
                bookingTime: true,
                stylistId: true,
                styleId: true,
                categoryId: true
            }
        });
        /* ---------------------------------------------------------
           4. LOAD STYLE DURATIONS
        --------------------------------------------------------- */
        const pricing = await prisma_1.default.stylePricing.findMany({
            select: {
                styleId: true,
                categoryId: true,
                durationMinutes: true
            }
        });
        const durationMap = new Map();
        pricing.forEach(p => {
            durationMap.set(`${p.styleId}_${p.categoryId}`, p.durationMinutes);
        });
        const getBookingDuration = (b) => {
            if (!b.styleId || !b.categoryId)
                return 60;
            return durationMap.get(`${b.styleId}_${b.categoryId}`) || 60;
        };
        /* ---------------------------------------------------------
           5. BUSINESS HOURS
        --------------------------------------------------------- */
        const settings = await prisma_1.default.salonSettings.findFirst();
        const businessHours = settings?.businessHours || DEFAULT_BUSINESS_HOURS;
        const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const toDateString = (d) => d.toISOString().split('T')[0];
        const result = {};
        const loopDate = new Date(start);
        /* ---------------------------------------------------------
           6. ITERATE OVER DATE RANGE AND BUILD SLOTS
        --------------------------------------------------------- */
        while (loopDate <= end) {
            const dateKey = toDateString(loopDate);
            const dayName = daysMap[loopDate.getUTCDay()];
            const dayConfig = businessHours[dayName];
            if (!dayConfig || !dayConfig.isOpen) {
                result[dateKey] = [];
                loopDate.setDate(loopDate.getDate() + 1);
                continue;
            }
            // Parse business open/close as total minutes (support HH:mm format)
            const openMinutes = parseTimeToMinutes(dayConfig.start);
            const closeMinutes = parseTimeToMinutes(dayConfig.end);
            const daySlots = [];
            const dayBookings = bookings.filter(b => toDateString(new Date(b.bookingDate)) === dateKey);
            // Generate slots every 60 minutes within the business window.
            // A slot is only valid if (slotStart + requestedDuration) <= closeMinutes.
            for (let slotStart = openMinutes; slotStart + requestedDuration <= closeMinutes; slotStart += 60) {
                const slotEnd = slotStart + requestedDuration;
                const freeStylists = [];
                for (const s of activeStylists) {
                    // Check leave
                    const isOnLeave = s.leaves.some(l => {
                        const ld = new Date(loopDate);
                        return ld >= new Date(l.startDate) && ld <= new Date(l.endDate);
                    });
                    if (isOnLeave)
                        continue;
                    // Check stylist's own working hours if set
                    if (s.workingHours) {
                        const schedule = s.workingHours[dayName];
                        if (schedule) {
                            if (!schedule.isOpen)
                                continue;
                            const sStart = parseTimeToMinutes(schedule.start);
                            const sEnd = parseTimeToMinutes(schedule.end);
                            // The entire slot must fit within the stylist's shift
                            if (slotStart < sStart || slotEnd > sEnd)
                                continue;
                        }
                    }
                    // Check existing bookings for conflict
                    const stylistBookings = dayBookings.filter(b => b.stylistId === s.id);
                    let hasConflict = false;
                    for (const b of stylistBookings) {
                        const time = new Date(b.bookingTime);
                        const bStart = time.getUTCHours() * 60 + time.getUTCMinutes();
                        const bDuration = getBookingDuration(b);
                        const bEnd = bStart + bDuration;
                        // Overlap: slot starts before existing booking ends AND ends after it starts
                        if (slotStart < bEnd && slotEnd > bStart) {
                            hasConflict = true;
                            break;
                        }
                    }
                    if (!hasConflict) {
                        freeStylists.push({
                            id: s.id,
                            name: s.user.fullName
                        });
                    }
                }
                if (freeStylists.length > 0) {
                    const hour = Math.floor(slotStart / 60);
                    const min = slotStart % 60;
                    daySlots.push({
                        time: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
                        available: true,
                        spots: freeStylists.length,
                        stylists: freeStylists
                    });
                }
            }
            result[dateKey] = daySlots;
            loopDate.setDate(loopDate.getDate() + 1);
        }
        if (startDate && endDate) {
            res.json(result);
        }
        else {
            res.json(result[toDateString(start)] || []);
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error fetching availability'
        });
    }
};
exports.getAvailability = getAvailability;
const setAvailability = async (req, res) => {
    try {
        const { date, time, stylistCount } = req.body;
        // Upsert availability
        const availability = await prisma_1.default.availability.upsert({
            where: {
                date_timeSlot: {
                    date: new Date(date),
                    timeSlot: new Date(`1970-01-01T${time}`)
                }
            },
            update: { stylistCount },
            create: {
                date: new Date(date),
                timeSlot: new Date(`1970-01-01T${time}`),
                stylistCount,
            },
        });
        res.json(availability);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error setting availability' });
    }
};
exports.setAvailability = setAvailability;
