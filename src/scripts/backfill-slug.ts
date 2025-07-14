import { db } from "../db";
import { products } from "../db/product-schema";
import { eq } from "drizzle-orm";
import { slugify } from "../utils/slugify";
import logger from "../utils/logger";

async function backfillSlugs() {
  logger.info("🔁 Backfilling slugs...");

  const allProducts = await db.select().from(products);

  for (const product of allProducts) {
    // Skip if already has a slug
    if (product.slug) continue;

    const slug = slugify(product.name);

    await db
      .update(products)
      .set({ slug })
      .where(eq(products._id, product._id));

    logger.info(`✅ Slug updated for: ${product.name} → ${slug}`);
  }

  if (allProducts.length === 0) {
    logger.info("⚠️ No products found — skipping backfill.");
    return;
  }

  logger.info("🎉 Slug backfill complete!");
}

backfillSlugs().catch((err) => {
  logger.error("❌ Failed to backfill slugs:", err);
  process.exit(1);
});
