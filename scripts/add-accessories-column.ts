import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding accessories column to typologies...");
  try {
    await db.execute(sql`ALTER TABLE typologies ADD COLUMN IF NOT EXISTS accessories TEXT;`);
    console.log("Column added successfully.");
  } catch (error) {
    console.error("Error adding column:", error);
  }
  process.exit(0);
}

main();
