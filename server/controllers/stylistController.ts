import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';

// Admin: Get all stylists
export const getAllStylists = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.user = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      };
    }

    const [stylists, total] = await Promise.all([
      prisma.stylist.findMany({
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
      prisma.stylist.count({ where })
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
      styles: (stylist as any).styles || []
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
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stylists' });
  }
};

// Admin: Get single stylist
export const getStylistById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const stylist = await prisma.stylist.findUnique({
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
      styles: (stylist as any).styles || []
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stylist' });
  }
};

// Admin: Create stylist
export const createStylist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password, phone, address, skillLevel, surcharge, styleIds, workingHours } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    // Create user and stylist in transaction
    const result = await prisma.$transaction(async (prisma) => {
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
            connect: styleIds.map((id: string) => ({ id }))
          } : undefined
        }
      });

      return stylist;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create stylist error:', error);
    res.status(500).json({ message: 'Error creating stylist' });
  }
};

// Admin: Update stylist
export const updateStylist = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { fullName, email, password, phone, address, skillLevel, surcharge, styleSurcharges, isActive, styleIds, workingHours } = req.body;

    const stylist = await prisma.stylist.findUnique({ where: { id } });
    if (!stylist) {
      res.status(404).json({ message: 'Stylist not found' });
      return;
    }

    // Update user and stylist in transaction
    await prisma.$transaction(async (prisma) => {
      // Update User fields
      const userUpdateData: any = {
        fullName,
        email,
        phone,
        address,
      };
      if (password) {
        userUpdateData.passwordHash = await bcrypt.hash(password, 10);
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
            connect: styleIds.map((sid: string) => ({ id: sid }))
          } : undefined
        }
      });
    });

    res.json({ message: 'Stylist updated successfully' });
  } catch (error) {
    console.error('Update stylist error:', error);
    res.status(500).json({ message: 'Error updating stylist' });
  }
};

// Admin: Delete stylist
export const deleteStylist = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    
    // Check if stylist exists
    const stylist = await prisma.stylist.findUnique({ 
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
    
    await prisma.$transaction(async (prisma) => {
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
  } catch (error) {
    console.error('Delete stylist error:', error);
    // Prisma error code for constraint violation is P2003
    if ((error as any).code === 'P2003') {
        res.status(400).json({ message: 'Cannot delete stylist with existing bookings' });
    } else {
        res.status(500).json({ message: 'Error deleting stylist' });
    }
  }
};

// Get current logged-in stylist profile
export const getMyStylistProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    const stylist = await prisma.stylist.findUnique({
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
  } catch (error) {
    console.error('Get my stylist profile error:', error);
    res.status(500).json({ message: 'Error fetching stylist profile' });
  }
};
