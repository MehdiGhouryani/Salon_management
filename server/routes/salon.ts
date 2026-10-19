import express from 'express';
import type { Request, Response } from 'express';
import { requireSalonMembership } from '../middleware/auth.ts';
import { salonRepository } from '../repositories/salonRepository.ts';
import { appointmentRepository } from '../repositories/appointmentRepository.ts';

export const salonRouter = express.Router({ mergeParams: true });

// Strict salon tenant membership gate (owner, manager, staff)
salonRouter.use(requireSalonMembership('owner', 'manager', 'staff'));

/**
 * GET /api/salon/:salonId/profile
 * Accesses tenant profile verifying tenant boundary
 */
salonRouter.get('/profile', async (req: Request, res: Response): Promise<void> => {
  const salonId = String(req.params.salonId);

  try {
    const salon = await salonRepository.findById(salonId);
    if (!salon) {
      res.status(404).json({
        error: 'SALON_NOT_FOUND',
        message: 'سالن مورد نظر یافت نشد.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      salon,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SALON_FETCH_ERROR',
      message: err.message,
    });
  }
});

/**
 * GET /api/salon/:salonId/appointments
 * Lists appointments strictly scoped to the tenant
 */
salonRouter.get('/appointments', async (req: Request, res: Response) => {
  const salonId = String(req.params.salonId);
  const status = req.query.status as any;

  try {
    const appointments = await appointmentRepository.findBySalonId(salonId, { status });
    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'APPOINTMENTS_FETCH_ERROR',
      message: err.message,
    });
  }
});
