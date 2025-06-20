import express from "express";
import multer from "multer";
import {
  createProduct,
  getAllProducts,
  getProductBySlug,
} from "../../controllers/products/product-controller";
import { tokenVerification } from "../../middleware/auth/admin-middleware";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/product",
  // tokenVerification,
  upload.array("files"),
  createProduct
);
router.get("/product", getAllProducts);
router.get("/product/:slug", getProductBySlug);

export default router;
