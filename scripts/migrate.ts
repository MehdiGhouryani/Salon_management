import { migrateUp, migrateDown, getMigrationStatus } from '../server/db/migrator.ts';
import { isDatabaseConfigured, closePool } from '../server/db/pool.ts';

async function main() {
  const command = (process.argv[2] || 'up').toLowerCase();

  console.log(`=== NobatAra Database Migration Runner ===`);
  console.log(`Command: ${command}`);

  if (!isDatabaseConfigured()) {
    console.error('❌ Error: Database is not configured in environment.');
    console.error('   Please provide DATABASE_URL or DB_HOST in your environment or .env file.');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'up': {
        const executed = await migrateUp();
        if (executed.length === 0) {
          console.log('✅ Database is already up to date. No pending migrations.');
        } else {
          console.log(`✅ Applied ${executed.length} migration(s): ${executed.join(', ')}`);
        }
        break;
      }
      case 'down': {
        const rolledBack = await migrateDown();
        if (rolledBack) {
          console.log(`✅ Rolled back migration: ${rolledBack}`);
        }
        break;
      }
      case 'status': {
        const statuses = await getMigrationStatus();
        console.log('\nMigration Status:');
        console.log('------------------------------------------------------------');
        for (const item of statuses) {
          const statusStr = item.applied
            ? `[APPLIED]  ${item.appliedAt ? new Date(item.appliedAt).toISOString() : ''}`
            : '[PENDING]';
          console.log(`  ${item.name.padEnd(35)} ${statusStr}`);
        }
        console.log('------------------------------------------------------------');
        break;
      }
      default:
        console.error(`Unknown command: "${command}". Use "up", "down", or "status".`);
        process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
