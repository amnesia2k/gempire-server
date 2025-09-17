import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "🧠 Gempire backend is alive!",
    timestamp: new Date().toISOString(),
  });
});

export default router;
