
import { pool } from "../server/db";

async function run() {
    try {
        console.log("Adding quoteId column to project_files table...");
        await pool.query('ALTER TABLE project_files ADD COLUMN IF NOT EXISTS "quote_id" VARCHAR REFERENCES quotes(id) ON DELETE SET NULL');
        console.log("Column added successfully.");
    } catch (error) {
        console.error("Error adding column:", error);
    } finally {
        process.exit(0);
    }
}

run();
