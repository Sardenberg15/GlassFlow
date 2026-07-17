import { db } from "../server/db.js";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`SELECT id, description, project_id, category_id FROM transactions LIMIT 5`);
  console.log("DB rows:", result.rows);
}
main();
