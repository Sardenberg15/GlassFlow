
import { pool } from "../server/db";

async function main() {
    try {
        console.log("Adding environment column to quote_items...");
        await pool.query(`
      ALTER TABLE quote_items
      ADD COLUMN IF NOT EXISTS environment TEXT;
    `);
        console.log("Column added successfully or already exists.");
    } catch (error) {
        console.error("Error adding column:", error);
    } finally {
        await pool.end();
    }
}

main();
