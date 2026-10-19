/**
 * NobatAra Full-Stack Server Entry Point
 * 
 * Supports:
 * - Development: Express server with Vite middleware mounted on port 3000
 * - Production: Express server serving compiled dist/ static assets and /api routes
 */

import { startServer } from './server/index.ts';

startServer().catch((err) => {
  console.error('[NobatAra Server] Fatal startup error:', err);
  process.exit(1);
});
