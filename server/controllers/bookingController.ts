import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import { emailService } from '../services/emailService';
import { notificationQueue } from '../services/notificationQueueService';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_PLACEHOLDER', {
  apiVersion: '2025-01-27.acacia' as any,
});

const getStylistSurcharge = (stylist: any, styleId: string | null): number => {
    if (!stylist) return 0;
    
    // Check for style-specific surcharge first
    if (stylist.styleSurcharges && styleId) {
        const styleSurcharges = stylist.styleSurcharges as Record<string, number>;
        const specificSurcharge = Number(styleSurcharges[styleId]);
        
        // Only use specific surcharge if it is defined and greater than 0
        if (styleSurcharges[styleId] !== undefined && specificSurcharge > 0) {
            return specificSurcharge;
        }
    }
    
    // Fallback to base surcharge
    if (stylist.surcharge) {
        return Number(stylist.surcharge);
    }
    
    return 0;
};

const isStylistWorking = (stylist: any, bookingDate: Date, timeStr: string): boolean => {
    if (!stylist || !stylist.workingHours) return true;
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayName = days[bookingDate.getUTCDay()];
    const schedule = (stylist.workingHours as any)[dayName];
    if (!schedule || !schedule.isOpen) return false;
    
    const [h, m] = timeStr.split(':').map(Number);
    const slotMins = h * 60 + m;
    
    const [sh, sm] = schedule.start.split(':').map(Number);
    const [eh, em] = schedule.end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    
    return slotMins >= startMins && slotMins < endMins;
};

export const getBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    const whereClause: any = {};
    if (userRole === 'customer') {
        whereClause.customerId = userId;
    } else if (userRole === 'stylist') {
        const stylist = await prisma.stylist.findUnique({
            where: { userId: userId }
        });
        
        if (stylist) {
            whereClause.stylistId = stylist.id;
        } else {
            res.json([]);
            return;
        }
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        customer: { select: { fullName: true, email: true, phone: true } },
        category: { select: { name: true } },
        style: { select: { name: true } },
        stylist: { 
            include: { 
                user: { select: { id: true, fullName: true } }
            } 
        },
        promo: {
          select: {
            id: true,
            title: true,
            promoMonth: true,
            promoYear: true,
            discountPercentage: true,
            promoPrice: true,
            stylePricing: {
              select: {
                style: { select: { name: true } },
                category: { select: { name: true } }
              }
            }
          }
        },
      },
      orderBy: { bookingDate: 'desc' }
    });

    const bookingsWithPrice = await Promise.all(bookings.map(async (booking) => {
        let price = 0;
        let duration = 60;

        if (booking.styleId && booking.categoryId) {
            const pricing = await prisma.stylePricing.findUnique({
                where: {
                    styleId_categoryId: {
                        styleId: booking.styleId,
                        categoryId: booking.categoryId
                    }
                }
            });
            if (pricing) {
                price = Number(pricing.price);
                duration = pricing.durationMinutes;
            }
        }

        // Add Stylist Surcharge (Dynamic)
        if (booking.stylist) {
             price += getStylistSurcharge(booking.stylist, booking.styleId);
        }
        
        return {
            ...booking,
            bookingDate: booking.bookingDate ? booking.bookingDate.toISOString().split('T')[0] : null,
            bookingTime: booking.bookingTime ? `${String(booking.bookingTime.getUTCHours()).padStart(2, '0')}:${String(booking.bookingTime.getUTCMinutes()).padStart(2, '0')}` : null,
            serviceName: booking.category?.name,
            styleName: booking.style?.name,
            price,
            duration
        };
    }));

    res.json(bookingsWithPrice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { styleId, categoryId, stylistId, date, time, guestDetails, promoId } = req.body;

    // Parse Date and Time
    const bookingDate = new Date(date + 'T00:00:00Z');

    let userId = (req as any).user?.id;

    // Validate Variation (formerly Category)
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
        res.status(400).json({ message: 'Invalid Variation (Category) ID' });
        return;
    }

    let serviceDisplayName = category.name;

    // Validate Style
    if (styleId) {
         const style = await prisma.style.findUnique({ where: { id: styleId } });
         if (!style) {
             res.status(400).json({ message: 'Invalid Style ID' });
             return;
         }

         serviceDisplayName = category.name || style.name;

         // Validate Stylist Capability
         if (stylistId) {
            // Check if stylist is on leave
            const onLeave = await prisma.stylistLeave.findFirst({
                where: {
                    stylistId,
                    startDate: { lte: bookingDate },
                    endDate: { gte: bookingDate }
                }
            });

            if (onLeave) {
                res.status(400).json({ message: 'Selected stylist is on leave for this date.' });
                return;
            }

            const capableStylist = await prisma.stylist.findFirst({
                where: {
                    id: stylistId,
                    styles: { some: { id: styleId } }
                }
            });

            if (!capableStylist) {
                const stylistExists = await prisma.stylist.findUnique({ where: { id: stylistId } });
                if (stylistExists) {
                     res.status(400).json({ message: 'Selected stylist cannot perform this style.' });
                     return;
                }
            } else {
                 if (!isStylistWorking(capableStylist, bookingDate, time)) {
                     res.status(400).json({ message: 'Selected stylist is not available during the requested working hours.' });
                     return;
                 }
            }
         } else if (stylistId) {
             const stylistExists = await prisma.stylist.findUnique({ where: { id: stylistId } });
             if (stylistExists && !isStylistWorking(stylistExists, bookingDate, time)) {
                  res.status(400).json({ message: 'Selected stylist is not available during the requested working hours.' });
                  return;
             }
         }
    } else if (stylistId) {
        const stylistExists = await prisma.stylist.findUnique({ where: { id: stylistId } });
        if (stylistExists && !isStylistWorking(stylistExists, bookingDate, time)) {
             res.status(400).json({ message: 'Selected stylist is not available during the requested working hours.' });
             return;
        }
    }

    // Handle Guest Booking
    if (!userId) {
        if (!guestDetails || !guestDetails.fullName || !guestDetails.email || !guestDetails.phone) {
             res.status(400).json({ message: 'Guest details (Name, Email, Phone) are required' });
             return;
        }

        let user = await prisma.user.findUnique({ where: { email: guestDetails.email } });

        if (!user) {
            const randomPassword = Math.random().toString(36).slice(-8);
            const passwordHash = await bcrypt.hash(randomPassword, 10);

            user = await prisma.user.create({
                data: {
                    fullName: guestDetails.fullName,
                    email: guestDetails.email,
                    phone: guestDetails.phone,
                    address: guestDetails.address || '',
                    role: 'customer',
                    passwordHash,
                    birthDay: guestDetails.birthDay ? Number(guestDetails.birthDay) : null,
                    birthMonth: guestDetails.birthMonth ? Number(guestDetails.birthMonth) : null,
                    notificationConsent: guestDetails.smsConsent ?? true,
                }
            });
            
            if (user.notificationConsent) {
                const { subject, html } = await emailService.getGuestCredentialsContent(guestDetails.fullName, randomPassword);
                await notificationQueue.add(
                    'EMAIL', 
                    'GN', 
                    guestDetails.email, 
                    html, 
                    subject, 
                    { type: 'GUEST_CREDENTIALS', userId: user.id }
                );
            }
        } else {
            if (guestDetails.birthDay && guestDetails.birthMonth && (!user.birthDay || !user.birthMonth)) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        birthDay: Number(guestDetails.birthDay),
                        birthMonth: Number(guestDetails.birthMonth)
                    }
                });
            }
        }
        
        userId = user.id;
    } else {
        // Logged in user - check for profile update (Birthday)
        if (guestDetails) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            const data: any = {};

            if (guestDetails.birthDay && guestDetails.birthMonth && user && (!user.birthDay || !user.birthMonth)) {
                data.birthDay = Number(guestDetails.birthDay);
                data.birthMonth = Number(guestDetails.birthMonth);
            }

            if (typeof (guestDetails as any).smsConsent === 'boolean') {
                data.notificationConsent = (guestDetails as any).smsConsent;
            }

            if (Object.keys(data).length > 0) {
                await prisma.user.update({
                    where: { id: userId },
                    data
                });
            }
        }
    }
    
    // Time string HH:mm to Date object (Epoch + Time) - Force UTC for Floating Time
    const timeParts = time.split(':');
    const bookingTime = new Date(0); // Epoch
    bookingTime.setUTCHours(Number(timeParts[0]));
    bookingTime.setUTCMinutes(Number(timeParts[1]));

    // Transaction to create booking (race condition protection)
    let result;
    try {
        result = await prisma.$transaction(async (tx) => {
            // Race Condition Check — check BOTH stylist availability AND customer duplicate booking

            // 1. If a specific stylist is selected, check if they are already booked at this time
            if (stylistId) {
                const existingBooking = await tx.booking.findFirst({
                    where: {
                        stylistId,
                        bookingDate,
                        bookingTime,
                        status: { notIn: ['cancelled'] }
                    }
                });

                if (existingBooking) {
                    throw new Error('Selected stylist is no longer available at this time.');
                }
            }

            // 2. Always check if this customer already has ANY booking at the same date+time
            // (prevents double-booking regardless of stylist selection)
            const customerDuplicate = await tx.booking.findFirst({
                where: {
                    customerId: userId,
                    bookingDate,
                    bookingTime,
                    status: { notIn: ['cancelled'] }
                }
            });

            if (customerDuplicate) {
                throw new Error('You already have a booking at this date and time.');
            }

            return tx.booking.create({
                data: {
                    customerId: userId,
                    styleId,
                    categoryId,
                    stylistId: stylistId || null,
                    promoId: promoId || null,
                    bookingDate,
                    bookingTime,
                    status: 'booked',
                },
            });
        });
    } catch (transactionError: any) {
        console.error('Booking transaction failed:', transactionError);
        res.status(409).json({ message: transactionError.message || 'Booking failed. Please try again.' });
        return;
    }

    const finalBooking = {
        ...result,
        bookingDate: result.bookingDate ? result.bookingDate.toISOString().split('T')[0] : null,
        bookingTime: result.bookingTime ? `${String(result.bookingTime.getUTCHours()).padStart(2, '0')}:${String(result.bookingTime.getUTCMinutes()).padStart(2, '0')}` : null,
    };

    // Queue Confirmation Email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (user && user.notificationConsent && user.email) {
        const { subject, html } = await emailService.getBookingConfirmationContent(
            user.fullName, 
            serviceDisplayName,
            date, 
            time, 
            !!guestDetails
        );
        await notificationQueue.add(
            'EMAIL', 
            'BN', 
            user.email, 
            html, 
            subject, 
            { bookingId: result.id, userId: user.id }
        );
    }

    res.status(201).json(finalBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Admin-only: Create a booking manually without payment.
 * Used for walk-in/phone bookings managed through the admin panel.
 */
export const createAdminBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const userRole = (req as any).user?.role;
        if (userRole !== 'admin') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        const { customerId, guestDetails, styleId, categoryId, stylistId, date, time, notes, status } = req.body;

        if (!date || !time) {
            res.status(400).json({ message: 'Date and time are required' });
            return;
        }

        if (!categoryId) {
            res.status(400).json({ message: 'Category (variation) is required' });
            return;
        }

        // Validate customer
        let finalCustomerId = customerId;
        let customer: any = null;
        
        if (customerId) {
            customer = await prisma.user.findUnique({ where: { id: customerId } });
        } else if (guestDetails) {
            customer = await prisma.user.findUnique({ where: { email: guestDetails.email } });
            if (!customer) {
                const randomPassword = Math.random().toString(36).slice(-8);
                const passwordHash = await bcrypt.hash(randomPassword, 10);
                customer = await prisma.user.create({
                    data: {
                        fullName: guestDetails.fullName,
                        email: guestDetails.email,
                        phone: guestDetails.phone,
                        role: 'customer',
                        passwordHash,
                    }
                });
            }
            finalCustomerId = customer.id;
        }

        if (!customer) {
            res.status(404).json({ message: 'Customer not found or details missing' });
            return;
        }

        const bookingDate = new Date(date + 'T00:00:00Z');
        const timeParts = (time as string).split(':');
        const bookingTime = new Date(0);
        bookingTime.setUTCHours(Number(timeParts[0]));
        bookingTime.setUTCMinutes(Number(timeParts[1]));

        // Validate stylist if provided
        if (stylistId) {
            // Check leave
            const onLeave = await prisma.stylistLeave.findFirst({
                where: {
                    stylistId,
                    startDate: { lte: bookingDate },
                    endDate: { gte: bookingDate }
                }
            });
            if (onLeave) {
                res.status(400).json({ message: 'Selected stylist is on leave for this date.' });
                return;
            }

            // Check stylist capability for the style
            if (styleId) {
                const capable = await prisma.stylist.findFirst({
                    where: { id: stylistId, styles: { some: { id: styleId } } }
                });
                if (!capable) {
                    res.status(400).json({ message: 'Selected stylist cannot perform this style.' });
                    return;
                }
                if (!isStylistWorking(capable, bookingDate, time)) {
                    res.status(400).json({ message: 'Selected stylist is not available during the requested working hours.' });
                    return;
                }
            } else {
                const stylistExists = await prisma.stylist.findUnique({ where: { id: stylistId } });
                if (stylistExists && !isStylistWorking(stylistExists, bookingDate, time)) {
                    res.status(400).json({ message: 'Selected stylist is not available during the requested working hours.' });
                    return;
                }
            }
        }

        // Create the booking within a transaction to prevent race conditions
        const booking = await prisma.$transaction(async (tx) => {
            // Check stylist double-booking
            if (stylistId) {
                const conflict = await tx.booking.findFirst({
                    where: {
                        stylistId,
                        bookingDate,
                        bookingTime,
                        status: { notIn: ['cancelled'] }
                    }
                });
                if (conflict) {
                    throw new Error('Selected stylist is already booked at this time.');
                }
            }

            // Check customer double-booking
            const customerConflict = await tx.booking.findFirst({
                where: {
                    customerId,
                    bookingDate,
                    bookingTime,
                    status: { notIn: ['cancelled'] }
                }
            });
            if (customerConflict) {
                throw new Error('This customer already has a booking at this date and time.');
            }

            return tx.booking.create({
                data: {
                    customerId: finalCustomerId,
                    styleId: styleId || null,
                    categoryId,
                    stylistId: stylistId || null,
                    bookingDate,
                    bookingTime,
                    status: status || 'booked',
                    notes: notes || null,
                },
                include: {
                    customer: { select: { fullName: true, email: true, phone: true } },
                    category: { select: { name: true } },
                    style: { select: { name: true } },
                    stylist: {
                        include: { user: { select: { id: true, fullName: true } } }
                    }
                }
            });
        });

        // Optionally notify the customer via email
        if (customer.notificationConsent && customer.email) {
            const category = await prisma.category.findUnique({ where: { id: categoryId } });
            const serviceDisplayName = category?.name || 'your appointment';

            try {
                const { subject, html } = await emailService.getBookingConfirmationContent(
                    customer.fullName,
                    serviceDisplayName,
                    date,
                    time,
                    false
                );
                await notificationQueue.add(
                    'EMAIL',
                    'BN',
                    customer.email,
                    html,
                    subject,
                    { bookingId: booking.id, userId: customer.id }
                );
            } catch (e) {
                console.error('Failed to queue confirmation email:', e);
            }
        }

        const responseBooking = {
            ...booking,
            bookingDate: booking.bookingDate ? booking.bookingDate.toISOString().split('T')[0] : null,
            bookingTime: booking.bookingTime ? `${String(booking.bookingTime.getUTCHours()).padStart(2, '0')}:${String(booking.bookingTime.getUTCMinutes()).padStart(2, '0')}` : null,
        };

        res.status(201).json(responseBooking);
    } catch (error: any) {
        console.error('Admin booking creation error:', error);
        if (error.message?.includes('already booked') || error.message?.includes('already has a booking')) {
            res.status(409).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: 'Error creating booking' });
    }
};

export const updateBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { status, stylistId, date, time, styleId, categoryId, notes } = req.body;

        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }

        const data: any = {};
        if (status) data.status = status;
        if (notes !== undefined) data.notes = notes;

        // Handle Rescheduling (Date/Time change)
        let parsedDate: Date | null = null;
        let parsedTime: Date | null = null;

        if (date && time) {
            parsedDate = new Date(date + 'T00:00:00Z');
            const timeParts = time.split(':');
            parsedTime = new Date(0);
            parsedTime.setUTCHours(Number(timeParts[0]));
            parsedTime.setUTCMinutes(Number(timeParts[1]));
            data.bookingDate = parsedDate;
            data.bookingTime = parsedTime;
        }

        // Handle style/category updates
        if (styleId !== undefined) data.styleId = styleId || null;
        if (categoryId !== undefined) data.categoryId = categoryId || null;

        // Determine effective date/time for conflict checks (use new values if provided, otherwise existing)
        const targetDate = parsedDate ?? booking.bookingDate;
        const targetTime = parsedTime ?? booking.bookingTime;

        if (stylistId !== undefined) {
            if (stylistId === '--select a stylist--' || stylistId === '' || stylistId === null) {
                data.stylistId = null;
            } else {
                // Check capability against the effective styleId
                const effectiveStyleId = styleId !== undefined ? styleId : booking.styleId;
                let stylistObj: any = null;
                if (effectiveStyleId) {
                    const capableStylist = await prisma.stylist.findFirst({
                        where: {
                            id: stylistId,
                            styles: { some: { id: effectiveStyleId } }
                        }
                    });
                    if (!capableStylist) {
                        res.status(400).json({ message: 'Selected stylist cannot perform this style.' });
                        return;
                    }
                    stylistObj = capableStylist;
                } else {
                    stylistObj = await prisma.stylist.findUnique({ where: { id: stylistId } });
                }

                // Verify working hours using original or new time
                const effectiveTimeStr = time !== undefined ? time : `${String(booking.bookingTime.getUTCHours()).padStart(2, '0')}:${String(booking.bookingTime.getUTCMinutes()).padStart(2, '0')}`;
                if (stylistObj && !isStylistWorking(stylistObj, targetDate, effectiveTimeStr)) {
                    res.status(400).json({ message: 'Selected stylist is not available during the requested working hours.' });
                    return;
                }

                // Check conflict at the target date/time (fixed: done AFTER we know target date/time)
                const conflict = await prisma.booking.findFirst({
                    where: {
                        stylistId,
                        bookingDate: targetDate,
                        bookingTime: targetTime,
                        status: { notIn: ['cancelled'] },
                        id: { not: id }
                    }
                });

                if (conflict) {
                    res.status(409).json({ message: 'Stylist is already booked at this time' });
                    return;
                }
                data.stylistId = stylistId;
            }
        } else if (parsedDate && parsedTime) {
            // Date/time changed but no stylist update — still check current stylist for conflicts
            const effectiveStylistId = booking.stylistId;
            if (effectiveStylistId) {
                const conflict = await prisma.booking.findFirst({
                    where: {
                        stylistId: effectiveStylistId,
                        bookingDate: parsedDate,
                        bookingTime: parsedTime,
                        status: { notIn: ['cancelled'] },
                        id: { not: id }
                    }
                });
                if (conflict) {
                    res.status(409).json({ message: 'The assigned stylist is already booked at the new time.' });
                    return;
                }
            }
        }
        
        const updatedBooking = await prisma.booking.update({
            where: { id },
            data,
            include: {
                customer: { select: { fullName: true, email: true, phone: true } },
                category: { select: { name: true } },
                style: { select: { name: true } },
                stylist: { 
                    include: { 
                        user: { select: { fullName: true } }
                    } 
                }
            }
        });

        let price = 0;
        const b = updatedBooking;
        if (b.styleId && b.categoryId) {
             const pricing = await prisma.stylePricing.findUnique({
                 where: {
                     styleId_categoryId: {
                         styleId: b.styleId,
                         categoryId: b.categoryId
                     }
                 }
             });
             if (pricing) price = Number(pricing.price);
        }

        // Add Stylist Surcharge
        if (b.stylist) {
             price += getStylistSurcharge(b.stylist, b.styleId);
        }

        const responseBooking = {
            ...updatedBooking,
            bookingDate: updatedBooking.bookingDate ? updatedBooking.bookingDate.toISOString().split('T')[0] : null,
            bookingTime: updatedBooking.bookingTime ? `${String(updatedBooking.bookingTime.getUTCHours()).padStart(2, '0')}:${String(updatedBooking.bookingTime.getUTCMinutes()).padStart(2, '0')}` : null,
            serviceName: b.category?.name,
            styleName: b.style?.name,
            price
        };

        // Check for status change to 'completed' — send email notification
        if (status === 'completed' && booking.status !== 'completed') {
             const customer = (updatedBooking as any).customer;
             const category = (updatedBooking as any).category;
             
             if (customer && customer.notificationConsent && customer.email) {
                 const { subject, html } = await emailService.getBookingCompletionContent(customer.fullName, category?.name || 'Service');
                 await notificationQueue.add(
                     'EMAIL', 
                     'BN', 
                     customer.email, 
                     html, 
                     subject, 
                     { bookingId: id, userId: customer.id }
                 );
             }
        }

        res.json(responseBooking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating booking' });
    }
};

export const checkInBooking = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const userId = (req as any).user?.id;
        const userRole = (req as any).user?.role;

        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }

        if (userRole !== 'admin' && userRole !== 'stylist' && booking.customerId !== userId) {
            res.status(403).json({ message: 'Not authorized to check in this booking' });
            return;
        }

        const now = new Date();
        const bookingDate = new Date(booking.bookingDate);
        const bookingTime = new Date(booking.bookingTime);
        
        const appointmentTime = new Date(bookingDate);
        appointmentTime.setUTCHours(bookingTime.getUTCHours());
        appointmentTime.setUTCMinutes(bookingTime.getUTCMinutes());
        appointmentTime.setUTCSeconds(0);
        
        const diffMs = now.getTime() - appointmentTime.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        console.log(`Check-in Attempt: Now=${now.toISOString()}, Appt=${appointmentTime.toISOString()}, Diff=${diffMinutes}m`);

        if (Math.abs(diffMinutes) > 30) {
             res.status(400).json({ message: 'Check-in only allowed 30 minutes before or after appointment' });
             return;
        }

        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: { status: 'checked_in' }
        });

        res.json({
            ...updatedBooking,
            bookingDate: updatedBooking.bookingDate ? updatedBooking.bookingDate.toISOString().split('T')[0] : null
        });

    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ message: 'Error checking in' });
    }
};

export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, guestDetails } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      receipt_email: guestDetails?.email,
      description: guestDetails ? `Deposit for ${guestDetails.fullName}` : undefined,
      metadata: {
        customer_name: guestDetails?.fullName,
        customer_phone: guestDetails?.phone,
        customer_email: guestDetails?.email
      },
       automatic_payment_methods: { enabled: false },
       payment_method_types: ["card", "us_bank_account"]
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
};

