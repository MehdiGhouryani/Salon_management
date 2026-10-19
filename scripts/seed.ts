import { runInitialSeed } from '../server/db/seeds/initialSeed.ts';
import { isDatabaseConfigured, closePool } from '../server/db/pool.ts';

async function main() {
  console.log('=== NobatAra Database Seeder ===');

  if (!isDatabaseConfigured()) {
    console.error('❌ Error: Database is not configured in environment.');
    console.error('   Please provide DATABASE_URL or DB_HOST in your environment or .env file.');
    process.exit(1);
  }

  const forceProduction = process.argv.includes('--force-production-seed');

  try {
    await runInitialSeed({ forceProduction });
    console.log('✅ Seed data successfully populated.');
  } catch (err: any) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
