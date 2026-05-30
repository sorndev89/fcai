"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const migrator_1 = require("drizzle-orm/mysql2/migrator");
const db_1 = require("../config/db");
const path_1 = __importDefault(require("path"));
async function runMigrations() {
    console.log('Running Drizzle migrations for MySQL...');
    try {
        // Use __dirname so this works from dist/db/migrate.cjs at runtime
        const migrationsFolder = path_1.default.resolve(__dirname, 'migrations');
        await (0, migrator_1.migrate)(db_1.db, { migrationsFolder });
        console.log('Migrations completed successfully.');
    }
    catch (error) {
        console.error('Failed to run migrations:', error);
        process.exit(1);
    }
    finally {
        await db_1.poolConnection.end();
    }
}
runMigrations();
//# sourceMappingURL=migrate.js.map