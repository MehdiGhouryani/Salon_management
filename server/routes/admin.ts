import express from 'express';
import type { Request, Response } from 'express';
import { requirePlatformRole } from '../middleware/auth.ts';
import { auditLogRepository } from '../repositories/auditLogRepository.ts';
import { salonRepository } from '../repositories/salonRepository.ts';

export const adminRouter = express.Router();

// Strict platform super-admin role gate
adminRouter.use(requirePlatformRole('super_admin'));

/**
 * GET /api/admin/audit-logs
 * Authorized audit logs retrieval for platform administrators
 */
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || '50'), 10);
  const offset = parseInt(String(req.query.offset || '0'), 10);
  const severity = req.query.severity as any;
  const category = req.query.category as any;

  try {
    const logs = await auditLogRepository.findAll({
      limit,
      offset,
      severity,
      category,
    });
    const total = await auditLogRepository.count({ severity, category });

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      logs,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'AUDIT_LOG_FETCH_ERROR',
      message: err.message,
    });
  }
});

/**
 * GET /api/admin/stats
 * Platform governance aggregate overview
 */
adminRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const salonsCount = await salonRepository.count();
    const activeSalonsCount = await salonRepository.count({ status: 'active' });

    res.status(200).json({
      success: true,
      platform: {
        totalSalons: salonsCount,
        activeSalons: activeSalonsCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'ADMIN_STATS_ERROR',
      message: err.message,
    });
  }
});
