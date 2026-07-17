
import { pool } from "../server/db";

async function main() {
    try {
        console.log("Adding torre de controle columns to projects...");
        await pool.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS obra_address TEXT,
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS tower_status JSONB;
    `);
        console.log("Columns added successfully or already exist.");
    } catch (error) {
        console.error("Error adding columns:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
