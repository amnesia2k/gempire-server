import express from "express";
import {
  accessDashboard,
  getAdmin,
  logoutAdmin,
} from "../controllers/admin-controller";

const router = express.Router();

router.post("/login", accessDashboard);
router.post("/logout", logoutAdmin);
router.get("/admin", getAdmin);

export default router;
