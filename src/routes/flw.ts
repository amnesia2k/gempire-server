// routes/flutterwaveBanks.ts
import express, { Request, Response } from "express";
import axios from "axios";

const router = express.Router();

router.get("/flutterwave/banks", async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(
      "https://api.flutterwave.com/v3/banks/NG",
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    res.json(response.data);
  } catch (err: any) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch banks" });
  }
});

export default router;
