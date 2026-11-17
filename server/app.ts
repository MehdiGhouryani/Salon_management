import express from 'express';
import type { Express } from 'express';
import { config } from './config.ts';
import cookieParser from 'cookie-parser';
import { correlationIdMiddleware } from './middleware/correlation.ts';
import {
  securityHeadersMiddleware,
  corsMiddleware,
  requestLoggerMiddleware,
} from './middleware/security.ts';
import {
  authenticateSession,
  csrfProtection,
} from './middleware/auth.ts';
import {
  apiNotFoundHandler,
  errorHandlerMiddleware,
} from './middleware/errorHandler.ts';
import { apiRouter } from './routes/index.ts';

/**
 * Creates and configures the Express application
 */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  // Explicit reverse-proxy trust policy (Phase 07): set TRUST_PROXY_COUNT in
  // the deployment environment when running behind a known proxy. Default:
  // trust nothing — client-supplied X-Forwarded-For cannot influence req.ip.
  app.set('trust proxy', config.trustProxy);

  // Correlation ID first so every log line carries it (Phase 16)
  app.use(correlationIdMiddleware);

  // Security & Logging Middlewares
  app.use(securityHeadersMiddleware);
  app.use(corsMiddleware);
  app.use(requestLoggerMiddleware);

  // Body Parsing with controlled limits
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

  // Cookie Parsing
  app.use(cookieParser());

  // Session Authentication & Context Loading
  app.use(authenticateSession);

  // CSRF Protection for state-mutating requests
  app.use(csrfProtection);

  // Mount API Router namespace under /api
  app.use('/api', apiRouter);

  // Trap all unknown /api/* requests with a strict JSON 404
  app.all('/api/*', apiNotFoundHandler);

  return app;
}
