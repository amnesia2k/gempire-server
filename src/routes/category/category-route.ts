import { Router } from "express";
import {
  createCategory,
  getAllCategories,
} from "../../controllers/category/category-controller";

const router = Router();

router.post("/create-category", createCategory);
router.get("/category", getAllCategories);

export default router;
