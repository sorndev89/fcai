import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db, poolConnection } from '../config/db';
import path from 'path';

async function runMigrations() {
  console.log('Running Drizzle migrations for MySQL...');
  try {
    // Use __dirname so this works from dist/db/migrate.cjs at runtime
    const migrationsFolder = path.resolve(__dirname, 'migrations');
    await migrate(db, { migrationsFolder });
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Failed to run migrations:', error);
    process.exit(1);
  } finally {
    await poolConnection.end();
  }
}

runMigrations();
