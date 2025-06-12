import { category, categoryRelations } from "./category-schema";
import { adminPasscodes } from "./passcode-schema";
import { productImages, productImagesRelations } from "./product-images-schema";
import { products, productsRelations } from "./product-schema";

export const schema = {
  adminPasscodes,
  products,
  productImages,
  category,
  categoryRelations,
  productsRelations,
  productImagesRelations,
};
