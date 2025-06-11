import express from "express";
import multer from "multer";
import { createProduct } from "../../controllers/products/product-controller";
import { tokenVerification } from "../../middleware/auth/admin-middleware";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/create-product",
  tokenVerification,
  upload.array("files"),
  createProduct
);

export default router;
