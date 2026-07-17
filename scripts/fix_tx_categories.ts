import { db } from "../server/db";
import { transactions, categories } from "../shared/schema";
import { eq, isNull } from "drizzle-orm";

async function run() {
    console.log("Looking for transactions with mismatched or missing categories...");

    // Get all transactions
    const allTx = await db.select().from(transactions);
    const allCats = await db.select().from(categories);
    let fixedCount = 0;

    for (const tx of allTx) {
        // Find if there is a category with the same name but matching type
        // e.g., if tx is "despesa", we want a category of type "despesa"
        if (!tx.categoryId) {
            // Try to infer from description (fallback)
            const isEmbalagem = tx.description.toLowerCase().includes("papelão") || tx.description.toLowerCase().includes("embalar");
            if (isEmbalagem && tx.type === "despesa") {
                const embalagemCat = allCats.find(c => c.name.toLowerCase().includes("embalagem") && c.type === "despesa");
                if (embalagemCat) {
                    await db.update(transactions).set({ categoryId: embalagemCat.id }).where(eq(transactions.id, tx.id));
                    fixedCount++;
                    console.log(`Fixed category for tx: ${tx.description} -> ${embalagemCat.name}`);
                }
            }
            continue;
        }

        const currentCat = allCats.find(c => c.id === tx.categoryId);
        if (currentCat && currentCat.type !== tx.type) {
            // Unmatched types! For instance, a "despesa" tx is linked to a "pagar" category
            // This happens because my old bill was "pagar", but the new transaction is "despesa".
            // Since the system migrated definitions, I can just find the correct mapped category:
            const mappedType = tx.type === "despesa" ? "despesa" : "receita"; // Types are already correct in tx

            // Try matching by exact name first
            let correctCat = allCats.find(c => c.name === currentCat.name && c.type === mappedType);

            if (!correctCat) {
                // If no identical name exists, just ignore - the user may just have deleted it.
                continue;
            }

            console.log(`Fixing category mismatch for tx: ${tx.description}. Changing category ${currentCat.name} to its ${mappedType} counterpart.`);
            await db.update(transactions).set({ categoryId: correctCat.id }).where(eq(transactions.id, tx.id));
            fixedCount++;
        }
    }

    console.log(`\nFinished! Fixed ${fixedCount} transaction category mismatches.`);
    process.exit(0);
}

run().catch(console.error);
