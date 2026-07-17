import { db } from "../server/db";
import { transactionFiles } from "../shared/schema";
import { desc } from "drizzle-orm";

async function run() {
    const files = await db.select().from(transactionFiles).orderBy(desc(transactionFiles.uploadedAt)).limit(10);
    console.log("Latest Transaction Files in DB:", files);
    process.exit(0);
}

run().catch(console.error);
