import express from "express";
import multer from "multer";
import {
  createProduct,
  deleteProduct,
  editProduct,
  getAllProducts,
  getProductBySlug,
} from "../controllers/product-controller";
import { tokenVerification } from "../middleware/auth/admin-middleware";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/product",
  // tokenVerification,
  upload.array("files"),
  createProduct
);
router.get("/products", getAllProducts);
router.get("/product/:slug", getProductBySlug);
router.patch("/product/:slug", upload.array("files"), editProduct);
router.delete("/product/:id", deleteProduct);

export default router;
