import "dotenv/config";
import { db } from "../server/db";
import { bills } from "../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  const allBills = await db.select().from(bills);
  console.log(`Found ${allBills.length} bills.`);
  
  const paidBills = allBills.filter(b => b.status === "pago" || b.status === "pago_parcial");
  console.log(`Found ${paidBills.length} paid or partially paid bills.`);
  
  process.exit(0);
}
main().catch(console.error);
