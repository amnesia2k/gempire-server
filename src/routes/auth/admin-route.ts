import express from "express";
import {
  accessDashboard,
  logoutAdmin,
} from "../../controllers/auth/admin-controller";

const router = express.Router();

router.post("/login", accessDashboard);
router.post("/logout", logoutAdmin);

export default router;
