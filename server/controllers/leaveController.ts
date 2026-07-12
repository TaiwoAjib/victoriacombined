import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Add leave for a stylist
export const createLeave = async (req: Request, res: Response): Promise<void> => {
    try {
        const stylistId = req.params.stylistId as string;
        const { startDate, endDate, reason } = req.body;

        if (!startDate || !endDate) {
            res.status(400).json({ message: 'Start date and end date are required' });
            return;
        }

        // Ensure dates are stored as UTC dates (midnight)
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Simple validation
        if (start > end) {
             res.status(400).json({ message: 'Start date cannot be after end date' });
             return;
        }

        const leave = await prisma.stylistLeave.create({
            data: {
                stylistId,
                startDate: start,
                endDate: end,
                reason
            }
        });

        res.status(201).json(leave);
    } catch (error) {
        console.error('Error creating leave:', error);
        res.status(500).json({ message: 'Failed to create leave record' });
    }
};

// Get leaves for a stylist
export const getLeaves = async (req: Request, res: Response): Promise<void> => {
    try {
        const stylistId = req.params.stylistId as string;
        const userRole = (req as any).user?.role;
        const userId = (req as any).user?.id;

        // Allow Admin or the Stylist themselves
        if (userRole !== 'admin') {
             const stylist = await prisma.stylist.findUnique({ where: { id: stylistId } });
             if (!stylist || stylist.userId !== userId) {
                 res.status(403).json({ message: 'Not authorized to view these leaves' });
                 return;
             }
        }
        
        const leaves = await prisma.stylistLeave.findMany({
            where: { stylistId },
            orderBy: { startDate: 'desc' }
        });

        res.json(leaves);
    } catch (error) {
        console.error('Error fetching leaves:', error);
        res.status(500).json({ message: 'Failed to fetch leave records' });
    }
};

// Delete a leave
export const deleteLeave = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        
        await prisma.stylistLeave.delete({
            where: { id }
        });

        res.status(200).json({ message: 'Leave record deleted successfully' });
    } catch (error) {
        console.error('Error deleting leave:', error);
        res.status(500).json({ message: 'Failed to delete leave record' });
    }
};

// Update a leave
export const updateLeave = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { startDate, endDate, reason } = req.body;

        if (!startDate || !endDate) {
            res.status(400).json({ message: 'Start date and end date are required' });
            return;
        }

        // Ensure dates are stored as UTC dates (midnight)
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Simple validation
        if (start > end) {
             res.status(400).json({ message: 'Start date cannot be after end date' });
             return;
        }

        const leave = await prisma.stylistLeave.update({
            where: { id },
            data: {
                startDate: start,
                endDate: end,
                reason
            }
        });

        res.status(200).json(leave);
    } catch (error) {
        console.error('Error updating leave:', error);
        res.status(500).json({ message: 'Failed to update leave record' });
    }
};
