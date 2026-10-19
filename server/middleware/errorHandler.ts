import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.ts';

/**
 * 404 Handler for the /api namespace
 * Guarantees that unknown API endpoints return structured JSON error instead of HTML SPA.
 */
export function apiNotFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'API_ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} does not exist.`,
      documentation: '/api/health/live',
    },
  });
}

/**
 * Centralized error handler middleware for Express
 * Prevents stack trace and sensitive detail leakage in production.
 */
export function errorHandlerMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
    ? err.statusCode
    : 500;

  // Log error message safely on the server
  console.error(`[ServerError] ${req.method} ${req.path} -> ${statusCode}:`, err.message || err);

  const isProduction = config.isProduction;

  // Safe client response
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR'),
      message: isProduction && statusCode === 500
        ? 'Internal server error occurred.'
        : (err.message || 'An unexpected error occurred.'),
      ...(isProduction ? {} : { details: err.details, stack: err.stack }),
    },
  });
}
