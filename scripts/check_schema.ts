import { db } from "../server/db.js";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'projects'
  `);
  console.log(result.rows);
  process.exit(0);
}
main();
