import "dotenv/config";
import { db } from "../server/db";
import { bills, transactions } from "../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  const allBills = await db.select().from(bills);
  let restored = 0;

  for (const bill of allBills) {
    if (bill.status === "pago" || bill.status === "pago_parcial") {
      const type = bill.type === "receber" ? "receita" : "despesa";
      if (!bill.projectId && !bill.clientId) continue; // Only recreate project/client related ones to fix UI ? No, all of them.
      
      await db.insert(transactions).values({
        type: type,
        description: `(Recuperado) Pagamento: ${bill.description}`,
        value: bill.value,
        date: bill.date || new Date().toISOString().split('T')[0],
        category: type === "receita" ? "Receitas de Projetos" : "Despesas Gerais", // Or whatever standard
        status: "efetivado",
        projectId: bill.projectId || null,
        clientId: bill.clientId || null,
        billId: bill.id,
      });
      restored++;
    }
  }
  
  console.log(`Restored ${restored} transactions from paid bills.`);
  process.exit(0);
}
main().catch(console.error);
