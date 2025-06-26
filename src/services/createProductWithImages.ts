import { createId } from "@paralleldrive/cuid2";
import { db } from "../db";
import { products } from "../db/product-schema";
import { productImages } from "../db/product-images-schema";
import { category } from "../db/category-schema";
import { eq } from "drizzle-orm";
import { slugify } from "../utils/slugify";
import { generateHybridId } from "../utils/id";
import { throwBadRequest, throwNotFound } from "../utils/error";
import { safeUploadToCloudinary } from "../utils/safe-upload";

type Input = {
  name: string;
  description?: string;
  price: number;
  unit: number;
  categoryId: string;
  files: Express.Multer.File[];
};

export const createProductWithImages = async ({
  name,
  description,
  price,
  unit,
  categoryId,
  files,
}: Input) => {
  if (
    !name ||
    !description ||
    !price ||
    !unit ||
    !files?.length ||
    !categoryId
  ) {
    throw throwBadRequest("All fields and at least one image are required.");
  }

  const slug = slugify(name);

  // 🛑 Check if a product with this slug already exists
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug));

  if (existingProduct) {
    throw throwBadRequest(
      `Product with the name "${name}" already exists. Please choose a different name.`
    );
  }

  const [existingCategory] = await db
    .select()
    .from(category)
    .where(eq(category._id, categoryId));

  if (!existingCategory) {
    throw throwNotFound("Invalid categoryId: Category not found");
  }

  const [newProduct] = await db
    .insert(products)
    .values({
      _id: createId(),
      productId: generateHybridId("gem"),
      name,
      slug,
      description,
      price: price.toString(),
      unit,
      categoryId,
    })
    .returning();

  const uploadedResults = await Promise.all(
    files.map((file) => safeUploadToCloudinary(file))
  );

  const imageRows = await db
    .insert(productImages)
    .values(
      uploadedResults.map(({ url, publicId }) => ({
        _id: createId(),
        productId: newProduct._id,
        imageUrl: url,
        publicId, // 👈 save it!
      }))
    )
    .returning();

  return {
    product: newProduct,
    images: imageRows,
  };
};
