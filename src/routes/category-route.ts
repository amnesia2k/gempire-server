import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
} from "../controllers/category-controller";
import { createRateLimiter } from "../utils/rate-limiter";

const router = Router();

const categoryRateLimiter = createRateLimiter("category", 10);

router.post("/", categoryRateLimiter, createCategory);
router.get("/all", getAllCategories);
router.get("/:slug", getCategoryById);

export default router;
