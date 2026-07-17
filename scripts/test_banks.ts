import { db } from "../server/db";
import { bankAccounts } from "../shared/schema";

async function main() {
  const accounts = await db.select().from(bankAccounts);
  console.log("Accounts:", accounts);
  process.exit(0);
}

main();
