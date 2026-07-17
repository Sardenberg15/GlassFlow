
import { db } from "../server/db";
import { quotes, quoteItems, clients } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    try {
        console.log("Testing DB insertion...");

        // 1. Get/Create a client (need one for FK)
        const [client] = await db.select().from(clients).limit(1);
        const clientId = client?.id;

        if (!clientId) {
            console.error("No clients found to test with.");
            process.exit(1);
        }

        console.log("Using client ID:", clientId);

        // 2. Create a dummy quote
        const [quote] = await db.insert(quotes).values({
            clientId: clientId,
            number: "TEST-ENV-001",
            status: "pendente",
            validUntil: "2025-12-31",
            discount: "0",
        }).returning();

        console.log("Created quote:", quote.id);

        // 3. Create a quote item WITH environment
        const [item] = await db.insert(quoteItems).values({
            quoteId: quote.id,
            description: "Test Item with Environment",
            quantity: "1",
            unitPrice: "100.00",
            total: "100.00",
            environment: "TEST LOCATION"
        }).returning();

        console.log("Created item:", item);

        // 4. Verify read back
        const [readItem] = await db.select().from(quoteItems).where(eq(quoteItems.id, item.id));
        console.log("Read back item:", readItem);

        if (readItem.environment === "TEST LOCATION") {
            console.log("SUCCESS: Environment field was saved and read correctly.");
        } else {
            console.log("FAILURE: Environment field is missing or incorrect.", readItem.environment);
        }

        // 5. Cleanup
        await db.delete(quotes).where(eq(quotes.id, quote.id));
        console.log("Cleanup done.");

    } catch (error) {
        console.error("Error during test:", error);
    } finally {
        process.exit(0);
    }
}

main();
