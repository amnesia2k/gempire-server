import express from "express";
import {
  accessDashboard,
  logoutAdmin,
} from "../../controllers/auth/admin-controller";

const router = express.Router();

router.post("/login-admin", accessDashboard);
router.post("/logout-admin", logoutAdmin);

export default router;
