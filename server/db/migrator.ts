import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool, isDatabaseConfigured, withTransaction } from './pool.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationRecord {
  id: number;
  name: string;
  applied_at: Date;
}

export interface MigrationFile {
  name: string;
  upPath: string;
  downPath: string | null;
}

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Ensures the schema_migrations tracking table exists
 */
export async function ensureMigrationsTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Discovers and sorts all available migration files in the migrations directory
 */
export function getAvailableMigrations(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR);
  const upFiles = files.filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql'));

  return upFiles.sort().map((file) => {
    const baseName = file.replace(/\.sql$/, '');
    const downFile = `${baseName}_down.sql`;
    const downPath = files.includes(downFile) ? path.join(MIGRATIONS_DIR, downFile) : null;

    return {
      name: baseName,
      upPath: path.join(MIGRATIONS_DIR, file),
      downPath,
    };
  });
}

/**
 * Retrieves the list of currently applied migrations from the database
 */
export async function getAppliedMigrations(): Promise<MigrationRecord[]> {
  await ensureMigrationsTable();
  const pool = getPool();
  const res = await pool.query<MigrationRecord>(
    'SELECT id, name, applied_at FROM schema_migrations ORDER BY id ASC'
  );
  return res.rows;
}

/**
 * Returns migration status for all available migrations (applied vs pending)
 */
export async function getMigrationStatus(): Promise<
  Array<{ name: string; applied: boolean; appliedAt?: Date }>
> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database is not configured. Cannot check migration status.');
  }

  const available = getAvailableMigrations();
  const applied = await getAppliedMigrations();
  const appliedMap = new Map(applied.map((m) => [m.name, m.applied_at]));

  return available.map((m) => ({
    name: m.name,
    applied: appliedMap.has(m.name),
    appliedAt: appliedMap.get(m.name),
  }));
}

/**
 * Executes all pending migrations in order inside individual transactions
 */
export async function migrateUp(): Promise<string[]> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database is not configured. Cannot run database migrations.');
  }

  await ensureMigrationsTable();
  const available = getAvailableMigrations();
  const applied = await getAppliedMigrations();
  const appliedSet = new Set(applied.map((m) => m.name));

  const pending = available.filter((m) => !appliedSet.has(m.name));
  const executed: string[] = [];

  for (const migration of pending) {
    console.log(`[NobatAra Migrator] Applying migration: ${migration.name}...`);
    const sql = fs.readFileSync(migration.upPath, 'utf-8');

    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name]);
    });

    console.log(`[NobatAra Migrator] Successfully applied: ${migration.name}`);
    executed.push(migration.name);
  }

  return executed;
}

/**
 * Rolls back the most recently applied migration
 */
export async function migrateDown(): Promise<string | null> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database is not configured. Cannot roll back migrations.');
  }

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  if (applied.length === 0) {
    console.log('[NobatAra Migrator] No migrations to roll back.');
    return null;
  }

  const lastApplied = applied[applied.length - 1];
  const available = getAvailableMigrations();
  const migrationFile = available.find((m) => m.name === lastApplied.name);

  if (!migrationFile || !migrationFile.downPath) {
    throw new Error(
      `Cannot rollback migration "${lastApplied.name}": matching _down.sql file not found.`
    );
  }

  console.log(`[NobatAra Migrator] Rolling back migration: ${lastApplied.name}...`);
  const sql = fs.readFileSync(migrationFile.downPath, 'utf-8');

  await withTransaction(async (client) => {
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE name = $1', [lastApplied.name]);
  });

  console.log(`[NobatAra Migrator] Successfully rolled back: ${lastApplied.name}`);
  return lastApplied.name;
}
