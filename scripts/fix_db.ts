import { db } from "../server/db.js";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Dropping updatedAt column from projects table manually...");
    try {
        await db.execute(sql`ALTER TABLE projects DROP COLUMN IF EXISTS "updatedAt"`);
        console.log("Success.");
    } catch (err: any) {
        console.error("Error:", err.message);
    }
    process.exit(0);
}
main();
