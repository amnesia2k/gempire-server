import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { logger } from "./utils/logger";
import job from "./utils/cron";
import { env } from "./utils/env";
import routes from "./routes/index-route";
import { connectRedis } from "./utils/redis";

// import "./services/invoice-worker";
// import "./services/confirmation-worker";

const app = express();
const PORT = env.PORT;

if (env.NODE_ENV === "production") {
  job.start();
}

app.set("trust proxy", 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;

      req.headers["accept-encoding"] = "gzip";
      return compression.filter(req, res);
    },
  })
);

(async () => {
  await connectRedis(); // Connect once at startup
})();

app.use("/api/v1", routes);

// error middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err);
  res.status(500).json({
    error: err.message,
    success: false,
    message: "Internal Server Error",
  });
});

// not found middleware
app.use((req, res) => {
  res
    .status(404)
    .json({ success: false, message: "Not Found", url: req.originalUrl });
});

app.listen(PORT, () => {
  logger.info(`Server is running on port http://localhost:${PORT}`);
});
