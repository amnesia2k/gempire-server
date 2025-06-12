import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
} from "../../controllers/category/category-controller";

const router = Router();

router.post("/category", createCategory);
router.get("/category", getAllCategories);
router.get("/category/:id", getCategoryById);

export default router;
