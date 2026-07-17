import { db } from "../server/db";
import { bills, transactions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function run() {
    console.log("Looking for paid bills missing transactions...");

    // Get all paid bills
    const paidBills = await db.select().from(bills).where(eq(bills.status, "pago"));
    let fixedCount = 0;

    for (const bill of paidBills) {
        // Check if a transaction with the same description and value exists
        const existingTx = await db.select().from(transactions).where(
            and(
                eq(transactions.description, bill.type === "receber" ? `Recebimento: ${bill.description}` : `Despesa: ${bill.description}`),
                eq(transactions.value, bill.value)
            )
        );

        if (existingTx.length === 0) {
            console.log(`Fixing missing transaction for bill: ${bill.description} (R$ ${bill.value})`);
            const paymentDate = new Date().toISOString().split('T')[0]; // fallback to today if needed, or bill.dueDate

            await db.insert(transactions).values({
                projectId: bill.projectId || null,
                categoryId: bill.categoryId || null,
                type: bill.type === "receber" ? "receita" : "despesa",
                description: bill.type === "receber" ? `Recebimento: ${bill.description}` : `Despesa: ${bill.description}`,
                value: bill.value,
                date: bill.dueDate, // use bill due date as approximate payment date for past records
            });
            fixedCount++;
        }
    }

    console.log(`\nFinished! Retroactively created ${fixedCount} missing transactions.`);
    process.exit(0);
}

run().catch(console.error);
