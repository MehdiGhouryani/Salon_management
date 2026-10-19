import dotenv from 'dotenv';

// Load .env only in non-production environments to avoid overriding container runtime configurations
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export type SupportedAppMode = 'development' | 'production' | 'test';
export type SupportedNodeEnv = 'development' | 'production' | 'test';

export interface DatabaseConfig {
  readonly url?: string;
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly user: string;
  readonly password?: string;
  readonly ssl: boolean;
  readonly poolMin: number;
  readonly poolMax: number;
  readonly idleTimeoutMs: number;
  readonly connectionTimeoutMs: number;
  readonly isConfigured: boolean;
}

export interface AuthConfig {
  readonly sessionSecret: string;
  readonly sessionCookieName: string;
  readonly sessionTtlHours: number;
  readonly sessionIdleMinutes: number;
  readonly otpTtlSeconds: number;
  readonly otpResendCooldownSeconds: number;
  readonly otpMaxAttempts: number;
  readonly kavenegarApiKey?: string;
  readonly isSmsConfigured: boolean;
}

export interface ServerConfig {
  readonly nodeEnv: SupportedNodeEnv;
  readonly appMode: SupportedAppMode;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly port: number;
  readonly host: string;
  readonly corsOrigins: string[];
  readonly bodyLimit: string;
  readonly database: DatabaseConfig;
  readonly auth: AuthConfig;
}

function parseAndValidateConfig(): ServerConfig {
  // 1. Validate NODE_ENV
  const rawNodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  const validNodeEnvs: SupportedNodeEnv[] = ['development', 'production', 'test'];
  if (!validNodeEnvs.includes(rawNodeEnv as SupportedNodeEnv)) {
    throw new Error(
      `[ServerConfig] Invalid NODE_ENV: "${process.env.NODE_ENV}". Must be one of: ${validNodeEnvs.join(', ')}`
    );
  }
  const nodeEnv = rawNodeEnv as SupportedNodeEnv;

  // 2. Validate APP_MODE
  const rawAppMode = (process.env.APP_MODE || (nodeEnv === 'production' ? 'production' : 'development'))
    .trim()
    .toLowerCase();
  const validAppModes: SupportedAppMode[] = ['development', 'production', 'test'];
  if (!validAppModes.includes(rawAppMode as SupportedAppMode)) {
    throw new Error(
      `[ServerConfig] Invalid APP_MODE: "${process.env.APP_MODE}". Must be one of: ${validAppModes.join(', ')}`
    );
  }
  const appMode = rawAppMode as SupportedAppMode;

  // 3. Validate PORT
  const rawPort = process.env.PORT || '3000';
  const parsedPort = parseInt(rawPort, 10);
  if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`[ServerConfig] Invalid PORT: "${rawPort}". Must be an integer between 1 and 65535.`);
  }

  // 4. Validate HOST
  const host = (process.env.HOST || '0.0.0.0').trim();

  // 5. Parse CORS Origins
  const rawCors = (process.env.CORS_ORIGIN || '').trim();
  const corsOrigins = rawCors
    ? rawCors.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const bodyLimit = (process.env.BODY_LIMIT || '1mb').trim();
  const isProduction = nodeEnv === 'production' || appMode === 'production';
  const isDevelopment = !isProduction;

  // 6. Parse and validate Database Configuration
  const rawDatabaseUrl = (process.env.DATABASE_URL || '').trim();
  if (rawDatabaseUrl && !rawDatabaseUrl.startsWith('postgres://') && !rawDatabaseUrl.startsWith('postgresql://')) {
    throw new Error('[ServerConfig] Invalid DATABASE_URL: must start with postgresql:// or postgres://');
  }

  const dbHost = (process.env.DB_HOST || '').trim();
  const rawDbPort = process.env.DB_PORT || '5432';
  const dbPort = parseInt(rawDbPort, 10);
  if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error(`[ServerConfig] Invalid DB_PORT: "${rawDbPort}". Must be an integer between 1 and 65535.`);
  }

  const dbName = (process.env.DB_NAME || 'nobatara').trim();
  const dbUser = (process.env.DB_USER || 'postgres').trim();
  const dbPassword = process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : undefined;
  const dbSsl = process.env.DB_SSL === 'true' || (rawDatabaseUrl.includes('sslmode=require'));

  const poolMin = parseInt(process.env.DB_POOL_MIN || '2', 10);
  const poolMax = parseInt(process.env.DB_POOL_MAX || '10', 10);
  const idleTimeoutMs = parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10);
  const connectionTimeoutMs = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10);

  // Database is configured if a connection URL is present or a non-empty DB_HOST is explicitly set
  const isDatabaseConfigured = Boolean(rawDatabaseUrl || dbHost);

  const database: DatabaseConfig = Object.freeze({
    url: rawDatabaseUrl || undefined,
    host: dbHost || 'localhost',
    port: dbPort,
    name: dbName,
    user: dbUser,
    password: dbPassword,
    ssl: dbSsl,
    poolMin: isNaN(poolMin) ? 2 : poolMin,
    poolMax: isNaN(poolMax) ? 10 : poolMax,
    idleTimeoutMs: isNaN(idleTimeoutMs) ? 30000 : idleTimeoutMs,
    connectionTimeoutMs: isNaN(connectionTimeoutMs) ? 5000 : connectionTimeoutMs,
    isConfigured: isDatabaseConfigured,
  });

  // 7. Parse and validate Authentication Configuration
  const rawSessionSecret = (process.env.SESSION_SECRET || '').trim();
  if (isProduction && (!rawSessionSecret || rawSessionSecret.length < 32)) {
    throw new Error(
      '[ServerConfig] In production, SESSION_SECRET must be set and contain at least 32 characters.'
    );
  }
  const sessionSecret = rawSessionSecret || 'dev-insecure-nobatara-session-secret-change-in-production';
  const sessionCookieName = (process.env.SESSION_COOKIE_NAME || 'nobatara_session').trim();
  const sessionTtlHours = parseInt(process.env.SESSION_TTL_HOURS || '336', 10); // 14 days
  const sessionIdleMinutes = parseInt(process.env.SESSION_IDLE_MINUTES || '120', 10); // 2 hours

  const otpTtlSeconds = parseInt(process.env.OTP_TTL_SECONDS || '120', 10); // 2 minutes
  const otpResendCooldownSeconds = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10); // 1 minute
  const otpMaxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10);

  const kavenegarApiKey = process.env.KAVENEGAR_API_KEY ? process.env.KAVENEGAR_API_KEY.trim() : undefined;
  const isSmsConfigured = Boolean(kavenegarApiKey);

  const auth: AuthConfig = Object.freeze({
    sessionSecret,
    sessionCookieName,
    sessionTtlHours: isNaN(sessionTtlHours) ? 336 : sessionTtlHours,
    sessionIdleMinutes: isNaN(sessionIdleMinutes) ? 120 : sessionIdleMinutes,
    otpTtlSeconds: isNaN(otpTtlSeconds) ? 120 : otpTtlSeconds,
    otpResendCooldownSeconds: isNaN(otpResendCooldownSeconds) ? 60 : otpResendCooldownSeconds,
    otpMaxAttempts: isNaN(otpMaxAttempts) ? 3 : otpMaxAttempts,
    kavenegarApiKey,
    isSmsConfigured,
  });

  return Object.freeze({
    nodeEnv,
    appMode,
    isProduction,
    isDevelopment,
    port: parsedPort,
    host,
    corsOrigins,
    bodyLimit,
    database,
    auth,
  });
}

export const config: ServerConfig = parseAndValidateConfig();
