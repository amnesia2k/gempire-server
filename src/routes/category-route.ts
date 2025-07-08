import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
} from "../controllers/category-controller";
import { createRateLimiter } from "../utils/rate-limiter";

const router = Router();

const categoryRateLimiter = createRateLimiter("category", 5);

router.post("/category", categoryRateLimiter, createCategory);
router.get("/categories", getAllCategories);
router.get("/category/:slug", getCategoryById);

export default router;
