
import { db } from "../server/db";
import { quoteItems } from "../shared/schema";
import { desc, isNotNull } from "drizzle-orm";

async function main() {
    try {
        console.log("Checking quote_items for environment data...");
        const items = await db.select().from(quoteItems).where(isNotNull(quoteItems.environment)).limit(5);

        if (items.length > 0) {
            console.log("Found items with environment data:", JSON.stringify(items, null, 2));
        } else {
            console.log("No items found with environment data.");
        }
    } catch (error) {
        console.error("Error querying database:", error);
    } finally {
        process.exit(0);
    }
}

main();
