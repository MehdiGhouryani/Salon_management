import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.ts';

/**
 * Applies security headers while preserving AI Studio iframe embedding in development
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Cross-Site Scripting protection filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Cache control for API endpoints
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Frame protection:
  // In development/AI Studio, the preview loads inside an iframe from Google Cloud Run domains.
  // We do not set restrictive X-Frame-Options in development to ensure AI Studio preview displays cleanly.
  if (config.isProduction) {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }

  next();
}

/**
 * Safe CORS Middleware that avoids open wildcard access in production
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (origin) {
    if (config.isDevelopment) {
      // In development, reflect origin for local testing
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (config.corsOrigins.length > 0 && config.corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

/**
 * Diagnostic request logger:
 * Formats: [HTTP] METHOD /path STATUS - DURATIONms
 * Omits any personal identifiable information, passwords, OTPs, or authorization headers.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    // Only log API routes or top-level documents to avoid log spam for static assets
    if (req.path.startsWith('/api') || res.statusCode >= 400) {
      const durationMs = Date.now() - startTime;
      const status = res.statusCode;
      const method = req.method;
      const url = req.path; // Use path only, omitting raw query parameters that might carry sensitive data

      console.log(`[HTTP] ${method} ${url} ${status} - ${durationMs}ms`);
    }
  });

  next();
}
