import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const acceptHeader = req.headers["accept"] || "";
    const wantsJSON = acceptHeader.includes("application/json");

    if (wantsJSON) {
      res.json({
        status: "success",
        message: "🧠 Gempire backend is alive!",
        timestamp: new Date().toISOString(),
      });
    } else {
      res.setHeader("Content-Type", "text/html");
      res.send(`<h1>🧠 Gempire backend is alive!</h1>`);
    }
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
