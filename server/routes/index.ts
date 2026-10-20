import express from 'express';
import { healthRouter } from './health.ts';
import { authRouter } from './auth.ts';
import { adminRouter } from './admin.ts';
import { salonRouter } from './salon.ts';
import { publicRouter } from './public.ts';
import { config } from '../config.ts';

export const apiRouter = express.Router();

// Mount Health Subsystem
apiRouter.use('/health', healthRouter);

// Mount Authentication & Identity Subsystem
apiRouter.use('/auth', authRouter);

// Mount Public Customer Discovery & Booking Subsystem (Phase 7)
apiRouter.use('/public', publicRouter);

// Mount Super Admin Governance Subsystem (RBAC Protected)
apiRouter.use('/admin', adminRouter);

// Mount Salon Tenant Operations Subsystem (Tenant Membership Protected)
apiRouter.use('/salon/:salonId', salonRouter);

// Base API Metadata (Public, non-sensitive)
apiRouter.get('/', (_req, res) => {
  res.status(200).json({
    name: 'NobatAra Platform API',
    version: '1.0.0-phase7',
    appMode: config.appMode,
    endpoints: {
      liveness: '/api/health/live',
      readiness: '/api/health/ready',
      authOtpRequest: '/api/auth/otp/request',
      authOtpVerify: '/api/auth/otp/verify',
      authMe: '/api/auth/me',
      authLogout: '/api/auth/logout',
      publicSalons: '/api/public/salons',
      publicAvailability: '/api/public/salons/:salonId/availability',
      publicBookings: '/api/public/bookings',
      myBookings: '/api/public/bookings/my',
    },
  });
});
