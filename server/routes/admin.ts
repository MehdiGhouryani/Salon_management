import express from 'express';
import type { Request, Response } from 'express';
import { authenticateSession, requireAuth, requirePlatformRole } from '../middleware/auth.ts';
import { auditLogRepository } from '../repositories/auditLogRepository.ts';
import { salonRepository } from '../repositories/salonRepository.ts';
import { userRepository } from '../repositories/userRepository.ts';
import { appointmentRepository } from '../repositories/appointmentRepository.ts';

export const adminRouter = express.Router();

// Strict platform super-admin role gate for all admin routes
adminRouter.use(authenticateSession);
adminRouter.use(requireAuth);
adminRouter.use(requirePlatformRole('super_admin'));

/**
 * GET /api/admin/stats
 * Platform governance aggregate overview with real database stats
 */
adminRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const salonsCount = await salonRepository.count();
    const activeSalonsCount = await salonRepository.count({ status: 'active' });
    const pendingSalonsCount = await salonRepository.count({ status: 'pending' });
    const suspendedSalonsCount = await salonRepository.count({ status: 'suspended' });

    const totalUsersCount = await userRepository.count();
    const totalAppointmentsCount = await appointmentRepository.countAll();

    res.status(200).json({
      success: true,
      platform: {
        totalSalons: salonsCount,
        activeSalons: activeSalonsCount,
        pendingSalons: pendingSalonsCount,
        suspendedSalons: suspendedSalonsCount,
        totalUsers: totalUsersCount,
        totalAppointments: totalAppointmentsCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'ADMIN_STATS_ERROR',
      message: err.message,
    });
  }
});

/**
 * GET /api/admin/salons
 * Search and filter salons list for Super Admin panel
 */
adminRouter.get('/salons', async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || '50'), 10);
  const offset = parseInt(String(req.query.offset || '0'), 10);
  const status = req.query.status as any;
  const search = req.query.search as string;

  try {
    const filter = {
      status: status !== 'all' ? status : undefined,
      search: search?.trim() || undefined,
      limit,
      offset,
    };
    const salons = await salonRepository.findAll(filter);
    const total = await salonRepository.count(filter);

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      salons,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SALON_FETCH_ERROR',
      message: err.message,
    });
  }
});

/**
 * PUT /api/admin/salons/:id/status
 * Approve, suspend, or reject salon with compulsory reason & audit log
 */
adminRouter.put('/salons/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!['active', 'pending', 'suspended', 'rejected', 'trial'].includes(status)) {
    return res.status(400).json({
      error: 'INVALID_STATUS',
      message: 'وضعیت ارسالی نامعتبر است.',
    });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({
      error: 'REASON_REQUIRED',
      message: 'ثبت علت برای تغییر وضعیت سالن الزامی است (حداقل ۳ کاراکتر).',
    });
  }

  try {
    const salon = await salonRepository.findById(id);
    if (!salon) {
      return res.status(404).json({
        error: 'SALON_NOT_FOUND',
        message: 'سالن مورد نظر یافت نشد.',
      });
    }

    const oldStatus = salon.status;
    const updatedSalon = await salonRepository.update(id, { status: status as any });

    // Record mandatory Audit Log entry with operator details
    await auditLogRepository.create({
      actor: req.user?.phone || 'super_admin',
      actorRole: 'super_admin',
      action: 'SALON_STATUS_CHANGE',
      target: `salon:${id}:${salon.name}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Platform Admin',
      severity: status === 'suspended' || status === 'rejected' ? 'critical' : 'info',
      category: 'business',
      details: {
        salonId: id,
        salonName: salon.name,
        oldStatus,
        newStatus: status,
        reason: reason.trim(),
      },
    });

    res.status(200).json({
      success: true,
      message: `وضعیت سالن با موفقیت به ${status} تغییر یافت.`,
      salon: updatedSalon,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SALON_STATUS_UPDATE_ERROR',
      message: err.message,
    });
  }
});

/**
 * GET /api/admin/users
 * Search and list platform users for Super Admin panel
 */
adminRouter.get('/users', async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || '50'), 10);
  const offset = parseInt(String(req.query.offset || '0'), 10);
  const role = req.query.role as any;
  const status = req.query.status as any;
  const search = req.query.search as string;

  try {
    const filter = {
      role: role !== 'all' ? role : undefined,
      status: status !== 'all' ? status : undefined,
      search: search?.trim() || undefined,
      limit,
      offset,
    };
    const users = await userRepository.findAll(filter);
    const total = await userRepository.count(filter);

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      users,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'USERS_FETCH_ERROR',
      message: err.message,
    });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Suspend or activate a platform user with compulsory reason
 */
adminRouter.put('/users/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!['active', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({
      error: 'INVALID_STATUS',
      message: 'وضعیت کاربر نامعتبر است.',
    });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({
      error: 'REASON_REQUIRED',
      message: 'ارائه علت برای تغییر وضعیت حساب کاربر الزامی است.',
    });
  }

  try {
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'کاربر مورد نظر یافت نشد.',
      });
    }

    const oldStatus = user.status;
    const updatedUser = await userRepository.update(id, { status });

    await auditLogRepository.create({
      actor: req.user?.phone || 'super_admin',
      actorRole: 'super_admin',
      action: 'USER_STATUS_CHANGE',
      target: `user:${id}:${user.phone}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Platform Admin',
      severity: status === 'suspended' ? 'critical' : 'info',
      category: 'privilege',
      details: {
        userId: id,
        userPhone: user.phone,
        oldStatus,
        newStatus: status,
        reason: reason.trim(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'وضعیت حساب کاربر به‌روزرسانی شد.',
      user: updatedUser,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'USER_STATUS_UPDATE_ERROR',
      message: err.message,
    });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user platform role — strictly prevents assigning super_admin via standard API
 */
adminRouter.put('/users/:id/role', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (role === 'super_admin') {
    return res.status(403).json({
      error: 'SUPER_ADMIN_ASSIGNMENT_FORBIDDEN',
      message: 'اعطای نقش Super Admin از طریق این مسیر عمومی مجاز نیست و فقط توسط اسکریپت ایمن بپوت‌استرپ امکان‌پذیر است.',
    });
  }

  if (!['user', 'platform_support', 'platform_auditor', 'financial_manager'].includes(role)) {
    return res.status(400).json({
      error: 'INVALID_ROLE',
      message: 'نقش انتخابی نامعتبر است.',
    });
  }

  try {
    const user = await userRepository.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'کاربر مورد نظر یافت نشد.',
      });
    }

    const oldRole = user.platform_role;
    const updatedUser = await userRepository.update(id, { platformRole: role });

    await auditLogRepository.create({
      actor: req.user?.phone || 'super_admin',
      actorRole: 'super_admin',
      action: 'USER_ROLE_CHANGE',
      target: `user:${id}:${user.phone}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Platform Admin',
      severity: 'warning',
      category: 'privilege',
      details: {
        userId: id,
        oldRole,
        newRole: role,
      },
    });

    res.status(200).json({
      success: true,
      message: 'نقش کاربر به‌روزرسانی شد.',
      user: updatedUser,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'USER_ROLE_UPDATE_ERROR',
      message: err.message,
    });
  }
});

/**
 * GET /api/admin/audit-logs
 * Authorized audit logs retrieval for platform administrators
 */
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || '50'), 10);
  const offset = parseInt(String(req.query.offset || '0'), 10);
  const severity = req.query.severity as any;
  const category = req.query.category as any;
  const search = req.query.search as string;

  try {
    const logs = await auditLogRepository.findAll({
      limit,
      offset,
      severity: severity !== 'all' ? severity : undefined,
      category: category !== 'all' ? category : undefined,
      search: search?.trim() || undefined,
    });
    const total = await auditLogRepository.count({
      severity: severity !== 'all' ? severity : undefined,
      category: category !== 'all' ? category : undefined,
      search: search?.trim() || undefined,
    });

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

