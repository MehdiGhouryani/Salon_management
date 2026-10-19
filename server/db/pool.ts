import pg from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config.ts';

const { Pool } = pg;

export class DatabaseNotConfiguredError extends Error {
  constructor(message = 'Database is not configured. Set DATABASE_URL or DB_HOST in environment.') {
    super(message);
    this.name = 'DatabaseNotConfiguredError';
  }
}

let activePool: pg.Pool | null = null;

/**
 * Builds or returns the singleton pg.Pool instance based on validated ServerConfig
 */
export function getPool(): pg.Pool {
  if (!config.database.isConfigured) {
    throw new DatabaseNotConfiguredError();
  }

  if (activePool) {
    return activePool;
  }

  const poolConfig: pg.PoolConfig = config.database.url
    ? {
        connectionString: config.database.url,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
        max: config.database.poolMax,
        min: config.database.poolMin,
        idleTimeoutMillis: config.database.idleTimeoutMs,
        connectionTimeoutMillis: config.database.connectionTimeoutMs,
      }
    : {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
        max: config.database.poolMax,
        min: config.database.poolMin,
        idleTimeoutMillis: config.database.idleTimeoutMs,
        connectionTimeoutMillis: config.database.connectionTimeoutMs,
      };

  activePool = new Pool(poolConfig);

  // Pool error listener to prevent uncaught exceptions on idle clients
  activePool.on('error', (err: Error) => {
    console.error('[NobatAra Database Pool] Unexpected error on idle client:', err.message);
  });

  return activePool;
}

/**
 * Checks whether database is configured in the environment
 */
export function isDatabaseConfigured(): boolean {
  return config.database.isConfigured;
}

/**
 * Executes a parameterized query using the pool or an optional client (for transactions)
 */
export async function query<R extends QueryResultRow = any>(
  text: string,
  params?: any[],
  client?: PoolClient
): Promise<QueryResult<R>> {
  const executor = client || getPool();
  const startTime = Date.now();

  try {
    const result = await executor.query<R>(text, params);
    const duration = Date.now() - startTime;
    if (config.isDevelopment && duration > 200) {
      console.warn(`[NobatAra Database Slow Query] (${duration}ms): ${text.substring(0, 80)}...`);
    }
    return result;
  } catch (err: any) {
    // Redact any potential connection string credentials from error output
    const sanitizedMessage = (err?.message || 'Unknown database query error')
      .replace(/:\/\/[^:]+:[^@]+@/g, '://***:***@');
    console.error('[NobatAra Database Query Error]', sanitizedMessage);
    throw new Error(`Database query failed: ${sanitizedMessage}`);
  }
}

/**
 * Executes an operation inside a database transaction with automatic BEGIN, COMMIT, ROLLBACK
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr: any) {
      console.error('[NobatAra Database] Rollback failed:', rollbackErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Checks database health with a lightweight SELECT 1 query
 */
export async function checkDbHealth(): Promise<{
  isConfigured: boolean;
  isHealthy: boolean;
  latencyMs?: number;
  error?: string;
}> {
  if (!config.database.isConfigured) {
    return {
      isConfigured: false,
      isHealthy: false,
      error: 'Database not configured in environment',
    };
  }

  const startTime = Date.now();
  try {
    const pool = getPool();
    // Test with timeout
    const result = await Promise.race([
      pool.query('SELECT 1 AS health_check'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database health check timed out (3000ms)')), 3000)
      ),
    ]);

    const latencyMs = Date.now() - startTime;
    const isHealthy = Boolean(result && result.rows && result.rows.length > 0);

    return {
      isConfigured: true,
      isHealthy,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const sanitizedError = (err?.message || 'Connection failed').replace(/:\/\/[^:]+:[^@]+@/g, '://***:***@');
    return {
      isConfigured: true,
      isHealthy: false,
      latencyMs,
      error: sanitizedError,
    };
  }
}

/**
 * Gracefully closes the connection pool
 */
export async function closePool(): Promise<void> {
  if (activePool) {
    try {
      await activePool.end();
      console.log('[NobatAra Database Pool] Connection pool drained successfully.');
    } catch (err: any) {
      console.error('[NobatAra Database Pool] Error during pool drain:', err.message);
    } finally {
      activePool = null;
    }
  }
}
