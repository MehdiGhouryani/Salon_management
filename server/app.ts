import express from 'express';
import type { Express } from 'express';
import { config } from './config.ts';
import cookieParser from 'cookie-parser';
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

  // Trust reverse proxy (Cloud Run, Cloudflare, etc.)
  app.set('trust proxy', 1);

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
