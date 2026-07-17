import { db } from "../server/db.js";
import { accessories } from "../shared/schema.js";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface CatalogItem {
  supplier: string;
  line: string;
  category: string;
  code: string;
  name: string;
  image: string | null;
}

async function main() {
  const items: CatalogItem[] = JSON.parse(
    readFileSync(join(__dirname, "accessories-catalog.json"), "utf-8")
  );
  console.log(`Seeding ${items.length} accessories...`);

  let inserted = 0;
  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize).map(item => ({
      code: item.code,
      name: item.name,
      category: item.category,
      supplier: item.supplier,
      line: item.line,
      imageUrl: item.image ? `/acessorios/${item.image}` : null,
    }));
    const result = await db
      .insert(accessories)
      .values(batch)
      .onConflictDoNothing({ target: accessories.code })
      .returning({ id: accessories.id });
    inserted += result.length;
    console.log(`  batch ${i / batchSize + 1}: +${result.length}`);
  }

  const [{ count }] = await db.execute(sql`SELECT count(*)::int AS count FROM accessories`).then(r => r.rows as any);
  console.log(`Done. Inserted ${inserted} new rows; table now has ${count} accessories.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
