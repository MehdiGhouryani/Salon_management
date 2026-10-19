import path from 'path';
import fs from 'fs';
import express from 'express';
import type { Express } from 'express';
import type { Server } from 'http';
import { config } from './config.ts';
import { createApp } from './app.ts';
import { errorHandlerMiddleware } from './middleware/errorHandler.ts';

export * from './config.ts';
export * from './app.ts';

/**
 * Initializes and starts the unified NobatAra HTTP server
 */
export async function startServer(): Promise<{ app: Express; server: Server }> {
  const app = createApp();

  if (config.isDevelopment) {
    // In development mode, mount Vite middleware for live compilation & HMR
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR !== 'true',
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[NobatAra Server] Vite dev middleware attached successfully.');
    } catch (err: any) {
      console.error('[NobatAra Server] Failed to initialize Vite middleware:', err.message);
      throw err;
    }
  } else {
    // In production mode, serve built frontend assets from dist/
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');

    if (!fs.existsSync(distPath)) {
      console.warn(`[NobatAra Server] Production warning: ${distPath} does not exist. Run 'npm run build' before production startup.`);
    }

    // Serve static files with caching
    app.use(
      express.static(distPath, {
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          // Long-term immutable caching for Vite's hashed assets
          if (filePath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    // SPA deep-link fallback: Send index.html for non-API client routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indexPath);
      } else {
        res.status(503).type('text/plain').send('Application build in progress or dist/ not found. Please run npm run build.');
      }
    });
  }

  // Centralized Error Handler (must be mounted after routes/middleware)
  app.use(errorHandlerMiddleware);

  // Bind to host and port
  const server = app.listen(config.port, config.host, () => {
    console.log(
      `[NobatAra Server] Running on http://${config.host}:${config.port} (env: ${config.nodeEnv}, mode: ${config.appMode})`
    );
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`[NobatAra Server] ${signal} signal received. Closing HTTP server...`);
    const { closePool } = await import('./db/pool.ts');
    server.close(async () => {
      console.log('[NobatAra Server] HTTP server closed. Draining database connection pool...');
      await closePool();
      console.log('[NobatAra Server] Graceful shutdown complete.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  return { app, server };
}
