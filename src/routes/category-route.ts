import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
} from "../controllers/category-controller";
import { createRateLimiter } from "../utils/rate-limiter";

const router = Router();

const categoriesRateLimiter = createRateLimiter("categories", 15);
const categoryRateLimiter = createRateLimiter("category", 5);

router.post("/category", categoryRateLimiter, createCategory);
router.get("/categories", categoriesRateLimiter, getAllCategories);
router.get("/category/:slug", categoriesRateLimiter, getCategoryById);

export default router;
