import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
} from "../controllers/category-controller";

const router = Router();

router.post("/category", createCategory);
router.get("/categories", getAllCategories);
router.get("/category/:slug", getCategoryById);

export default router;
