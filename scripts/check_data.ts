import { db } from "../server/db.js";
import { sql } from "drizzle-orm";

async function main() {
  const result1 = await db.execute(sql`SELECT COUNT("updatedAt") as c1 FROM projects`);
  const result2 = await db.execute(sql`SELECT COUNT("updated_at") as c2 FROM projects`);
  console.log("updatedAt count:", result1.rows);
  console.log("updated_at count:", result2.rows);
  process.exit(0);
}
main();
