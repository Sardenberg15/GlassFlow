import "dotenv/config";
import { db } from "../server/db";
import { transactions, bills } from "../shared/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Cleaning old transactions and bills...");
  await db.delete(transactions);
  console.log("Transactions deleted.");
  // Make sure not to delete bills? well the user said "Hoje meu saldo atual.. 405k".
  // Let's just delete transactions.
  process.exit(0);
}
main().catch(console.error);
