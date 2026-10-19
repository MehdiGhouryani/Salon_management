import express from 'express';
import type { Request, Response } from 'express';
import { config } from '../config.ts';
import { checkDbHealth } from '../db/pool.ts';

export const healthRouter = express.Router();

const serverStartTime = Date.now();

/**
 * GET /api/health/live
 * Process liveness check confirming the HTTP runtime process is alive and responsive.
 * Must remain fast and isolated from external dependencies.
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);

  res.status(200).json({
    status: 'ok',
    service: 'nobatara-server',
    environment: config.nodeEnv,
    appMode: config.appMode,
    timestamp: new Date().toISOString(),
    uptimeSeconds,
  });
});

/**
 * GET /api/health/ready
 * Readiness check with database-aware probing.
 * Tests live connection pool when configured.
 * Returns 503 if database is configured but unreachable.
 * Returns 200 with 'degraded' status if database is pending configuration.
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const dbHealth = await checkDbHealth();

  if (dbHealth.isConfigured && !dbHealth.isHealthy) {
    // Database is explicitly configured in environment but failed health check
    res.status(503).json({
      status: 'unhealthy',
      service: 'nobatara-server',
      timestamp: new Date().toISOString(),
      runtime: {
        httpServer: 'online',
        nodeVersion: process.version,
      },
      database: {
        status: 'unreachable',
        configured: true,
        latencyMs: dbHealth.latencyMs,
        error: dbHealth.error,
      },
      subsystems: {
        database: 'unreachable',
        serverAuth: 'not_configured (scheduled Phase 5)',
        smsGateway: 'not_configured (scheduled Phase 10)',
        paymentGateway: 'not_configured (scheduled Phase 10)',
      },
    });
    return;
  }

  const isDegraded = !dbHealth.isConfigured;

  res.status(200).json({
    status: isDegraded ? 'degraded' : 'ready',
    service: 'nobatara-server',
    timestamp: new Date().toISOString(),
    runtime: {
      httpServer: 'online',
      nodeVersion: process.version,
    },
    database: dbHealth.isConfigured
      ? {
          status: 'connected',
          configured: true,
          latencyMs: dbHealth.latencyMs,
        }
      : {
          status: 'not_configured',
          configured: false,
          message: 'Database connection parameters not set in environment (Cloud SQL integration pending).',
        },
    subsystems: {
      database: dbHealth.isConfigured ? 'connected' : 'not_configured (Cloud SQL pending)',
      serverAuth: 'not_configured (scheduled Phase 5)',
      smsGateway: 'not_configured (scheduled Phase 10)',
      paymentGateway: 'not_configured (scheduled Phase 10)',
    },
  });
});

