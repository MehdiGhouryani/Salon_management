import express from 'express';
import { safeInternalErrorMessage } from '../middleware/errorHandler.ts';
import type { Request, Response } from 'express';
import { authenticateSession, requireAuth, requirePlatformRole } from '../middleware/auth.ts';
import { withTransaction } from '../db/pool.ts';
import { rateLimit } from '../middleware/rateLimit.ts';
import { normalizeIranianPhone } from '../utils/phone.ts';
import { auditLogRepository } from '../repositories/auditLogRepository.ts';
import { salonRepository } from '../repositories/salonRepository.ts';
import { userRepository } from '../repositories/userRepository.ts';
import { appointmentRepository } from '../repositories/appointmentRepository.ts';
import { staffRepository } from '../repositories/staffRepository.ts';
import { supportTicketRepository, type SupportTicketStatus, type SupportTicketPriority } from '../repositories/supportTicketRepository.ts';
import { subscriptionRepository } from '../repositories/subscriptionRepository.ts';
import { config } from '../config.ts';
import { isDatabaseConfigured } from '../db/pool.ts';

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
      message: safeInternalErrorMessage(err),
    });
  }
});

/**
 * GET /api/admin/salons
 * Search and filter salons list for Super Admin panel.
 * Each row carries REAL operational aggregates (Phase 18) computed from the
 * appointments/staff tables — the console never receives fabricated numbers:
 *  - monthlyRevenue: sum of confirmed/completed appointment prices inside the
 *    current Asia/Tehran calendar month
 *  - totalAppointments: all appointment rows for the salon
 *  - activeStaffCount: staff rows with is_active = TRUE
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

    // Real per-salon aggregates for the returned page (missing entry = zero).
    const salonIds = salons.map((s) => s.id);
    const [bookingAggregates, staffCounts] = await Promise.all([
      appointmentRepository.getSalonBookingAggregates(salonIds),
      staffRepository.getActiveStaffCounts(salonIds),
    ]);
    const withAggregates = salons.map((s) => ({
      ...s,
      monthlyRevenue: bookingAggregates.get(s.id)?.monthlyRevenue ?? 0,
      totalAppointments: bookingAggregates.get(s.id)?.totalAppointments ?? 0,
      activeStaffCount: staffCounts.get(s.id) ?? 0,
    }));

    res.status(200).json({
      success: true,
      total,
      limit,
      offset,
      salons: withAggregates,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SALON_FETCH_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});

/**
 * PUT /api/admin/salons/:id/status
 * Approve, suspend, or reject salon with compulsory reason & audit log
 */
adminRouter.put('/salons/:id/status',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    keyFor: (req) => String(req.user?.id || req.ip || 'unknown'),
  }),
  async (req: Request, res: Response) => {
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
    // Transactional mutation (Phase 06): the status change and its mandatory
    // audit log commit or roll back together — an unlogged mutation is never
    // reported as successful.
    const updatedSalon = await withTransaction(async (txClient) => {
      const updated = await salonRepository.update(id, { status: status as any }, txClient);

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
      }, txClient);

      return updated;
    });

    res.status(200).json({
      success: true,
      message: `وضعیت سالن با موفقیت به ${status} تغییر یافت.`,
      salon: updatedSalon,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SALON_STATUS_UPDATE_ERROR',
      message: safeInternalErrorMessage(err),
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
      message: safeInternalErrorMessage(err),
    });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Suspend or activate a platform user with compulsory reason
 */
adminRouter.put('/users/:id/status',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    keyFor: (req) => String(req.user?.id || req.ip || 'unknown'),
  }),
  async (req: Request, res: Response) => {
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

    // Phase 07: administrators cannot suspend themselves, and the last active
    // super admin can never be suspended.
    if (id === req.user?.id && status === 'suspended') {
      return res.status(400).json({
        error: 'SELF_SUSPENSION_FORBIDDEN',
        message: 'امکان تعلیق حساب کاربری خودتان وجود ندارد.',
      });
    }
    if (user.platform_role === 'super_admin' && status === 'suspended') {
      const activeSuperAdmins = (await userRepository.findAll({ role: 'super_admin', status: 'active' })).length;
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          error: 'LAST_SUPER_ADMIN_PROTECTED',
          message: 'حداقل یک مدیر ارشد فعال باید در سامانه باقی بماند.',
        });
      }
    }

    const oldStatus = user.status;
    // Transactional mutation (Phase 06): status change + audit log atomic.
    const updatedUser = await withTransaction(async (txClient) => {
      const updated = await userRepository.update(id, { status }, txClient);

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
      }, txClient);

      return updated;
    });

    res.status(200).json({
      success: true,
      message: 'وضعیت حساب کاربر به‌روزرسانی شد.',
      user: updatedUser,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'USER_STATUS_UPDATE_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user platform role — strictly prevents assigning super_admin via standard API
 */
adminRouter.put('/users/:id/role',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    keyFor: (req) => String(req.user?.id || req.ip || 'unknown'),
  }),
  async (req: Request, res: Response) => {
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

    // Phase 07: administrators cannot change their own role, and the last
    // active super admin can never be demoted.
    if (id === req.user?.id) {
      return res.status(400).json({
        error: 'SELF_ROLE_CHANGE_FORBIDDEN',
        message: 'تغییر نقش کاربری توسط خود کاربر مجاز نیست.',
      });
    }
    if (user.platform_role === 'super_admin' && role !== 'super_admin') {
      const activeSuperAdmins = (await userRepository.findAll({ role: 'super_admin', status: 'active' })).length;
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          error: 'LAST_SUPER_ADMIN_PROTECTED',
          message: 'حداقل یک مدیر ارشد فعال باید در سامانه باقی بماند.',
        });
      }
    }

    const oldRole = user.platform_role;
    // Transactional mutation (Phase 06): role change + audit log atomic.
    const updatedUser = await withTransaction(async (txClient) => {
      const updated = await userRepository.update(id, { platformRole: role }, txClient);

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
      }, txClient);

      return updated;
    });

    res.status(200).json({
      success: true,
      message: 'نقش کاربر به‌روزرسانی شد.',
      user: updatedUser,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'USER_ROLE_UPDATE_ERROR',
      message: safeInternalErrorMessage(err),
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
      message: safeInternalErrorMessage(err),
    });
  }
});



/** Persistent support queue, restricted by the router-level super-admin gate. */
adminRouter.get('/support/tickets', async (req: Request, res: Response): Promise<void> => {
  const rawLimit = Number.parseInt(String(req.query.limit || '50'), 10);
  const rawOffset = Number.parseInt(String(req.query.offset || '0'), 10);
  const status = String(req.query.status || '');
  const priority = String(req.query.priority || '');
  const search = String(req.query.search || '').trim();

  if (status && status !== 'all' && !['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    res.status(400).json({ error: 'INVALID_TICKET_STATUS', message: 'وضعیت تیکت نامعتبر است.' });
    return;
  }
  if (priority && priority !== 'all' && !['low', 'medium', 'high', 'critical'].includes(priority)) {
    res.status(400).json({ error: 'INVALID_TICKET_PRIORITY', message: 'اولویت تیکت نامعتبر است.' });
    return;
  }
  if (search.length > 100) {
    res.status(400).json({ error: 'SEARCH_TOO_LONG', message: 'عبارت جستجو بیش از حد طولانی است.' });
    return;
  }

  const filter = {
    status: status && status !== 'all' ? status as SupportTicketStatus : undefined,
    priority: priority && priority !== 'all' ? priority as SupportTicketPriority : undefined,
    search: search || undefined,
    limit: Number.isSafeInteger(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 50,
    offset: Number.isSafeInteger(rawOffset) ? Math.max(0, Math.min(1_000_000, rawOffset)) : 0,
  };

  try {
    const [tickets, total] = await Promise.all([
      supportTicketRepository.findAll(filter),
      supportTicketRepository.count(filter),
    ]);
    res.status(200).json({ success: true, tickets, total, limit: filter.limit, offset: filter.offset });
  } catch (err: any) {
    res.status(500).json({
      error: 'SUPPORT_TICKETS_FETCH_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});

adminRouter.post(
  '/support/tickets/:id/messages',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    keyFor: (req) => String(req.user?.id || req.ip || 'unknown'),
    code: 'SUPPORT_REPLY_RATE_LIMIT',
  }),
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = String(req.params.id);
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 5000) {
      res.status(400).json({ error: 'INVALID_SUPPORT_MESSAGE', message: 'متن پاسخ باید بین ۱ تا ۵۰۰۰ نویسه باشد.' });
      return;
    }

    try {
      const ticket = await supportTicketRepository.findById(ticketId);
      if (!ticket) {
        res.status(404).json({ error: 'SUPPORT_TICKET_NOT_FOUND', message: 'تیکت مورد نظر یافت نشد.' });
        return;
      }

      const message = await withTransaction(async (client) => {
        const created = await supportTicketRepository.addMessage(ticketId, {
          senderUserId: req.user!.id,
          senderName: req.user!.full_name,
          senderRole: 'admin',
          content,
        }, client);
        await supportTicketRepository.updateStatus(ticketId, 'in_progress', client);
        await auditLogRepository.create({
          actor: req.user!.full_name,
          actorRole: req.user!.platform_role,
          action: 'SUPPORT_TICKET_REPLY',
          target: 'support-ticket:' + ticket.ticketNumber,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: String(req.headers['user-agent'] || 'Unknown'),
          severity: 'info',
          category: 'system',
          details: { ticketId, ticketNumber: ticket.ticketNumber, messageId: created.id },
        }, client);
        return created;
      });

      res.status(201).json({ success: true, message: 'پاسخ با موفقیت ثبت شد.', ticketMessage: message });
    } catch (err: any) {
      res.status(500).json({
        error: 'SUPPORT_TICKET_REPLY_ERROR',
        message: safeInternalErrorMessage(err),
      });
    }
  }
);

adminRouter.patch('/support/tickets/:id/status', async (req: Request, res: Response): Promise<void> => {
  const ticketId = String(req.params.id);
  const status = String(req.body?.status || '');
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    res.status(400).json({ error: 'INVALID_TICKET_STATUS', message: 'وضعیت تیکت نامعتبر است.' });
    return;
  }

  try {
    const ticket = await supportTicketRepository.findById(ticketId);
    if (!ticket) {
      res.status(404).json({ error: 'SUPPORT_TICKET_NOT_FOUND', message: 'تیکت مورد نظر یافت نشد.' });
      return;
    }

    await withTransaction(async (client) => {
      const updated = await supportTicketRepository.updateStatus(ticketId, status as SupportTicketStatus, client);
      if (!updated) throw new Error('Support ticket disappeared during status update.');
      await auditLogRepository.create({
        actor: req.user!.full_name,
        actorRole: req.user!.platform_role,
        action: 'SUPPORT_TICKET_STATUS_CHANGE',
        target: 'support-ticket:' + ticket.ticketNumber,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: String(req.headers['user-agent'] || 'Unknown'),
        severity: status === 'closed' ? 'warning' : 'info',
        category: 'system',
        details: { ticketId, ticketNumber: ticket.ticketNumber, oldStatus: ticket.status, newStatus: status },
      }, client);
    });

    const updatedTicket = await supportTicketRepository.findById(ticketId);
    res.status(200).json({ success: true, ticket: updatedTicket });
  } catch (err: any) {
    res.status(500).json({
      error: 'SUPPORT_TICKET_STATUS_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});


/** Real subscription, revenue and gateway state for the platform finance console. */
adminRouter.get('/subscriptions/overview', async (req: Request, res: Response): Promise<void> => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({
      error: 'SUBSCRIPTION_DATABASE_UNAVAILABLE',
      message: 'برای نمایش گزارش مالی واقعی، اتصال PostgreSQL لازم است.',
    });
    return;
  }

  const limit = Number.parseInt(String(req.query.limit || '20'), 10);
  const offset = Number.parseInt(String(req.query.offset || '0'), 10);
  try {
    const overview = await subscriptionRepository.getAdminOverview(
      Number.isSafeInteger(limit) ? Math.min(100, Math.max(1, limit)) : 20,
      Number.isSafeInteger(offset) ? Math.max(0, Math.min(1_000_000, offset)) : 0
    );
    res.status(200).json({
      success: true,
      ...overview,
      paymentEnabled: config.payments.isZarinpalConfigured,
      paymentSandbox: config.payments.zarinpalSandbox,
      availableGateway: 'zarinpal',
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SUBSCRIPTION_OVERVIEW_ERROR',
      message: safeInternalErrorMessage(err),
    });
  }
});
