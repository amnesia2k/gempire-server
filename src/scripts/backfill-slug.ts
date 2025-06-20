import { db } from "../db";
import { products } from "../db/product-schema";
import { eq } from "drizzle-orm";
import { slugify } from "../utils/slugify";

async function backfillSlugs() {
  console.log("🔁 Backfilling slugs...");

  const allProducts = await db.select().from(products);

  for (const product of allProducts) {
    // Skip if already has a slug
    if (product.slug) continue;

    const slug = slugify(product.name);

    await db
      .update(products)
      .set({ slug })
      .where(eq(products._id, product._id));

    console.log(`✅ Slug updated for: ${product.name} → ${slug}`);
  }

  if (allProducts.length === 0) {
    console.log("⚠️ No products found — skipping backfill.");
    return;
  }

  console.log("🎉 Slug backfill complete!");
}

backfillSlugs().catch((err) => {
  console.error("❌ Failed to backfill slugs:", err);
  process.exit(1);
});
