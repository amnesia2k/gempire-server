import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;
const app = express();

// 🌍 Allowed origins for CORS
const allowedOrigins = [
  "https://auth-api-v1-tau.vercel.app", // prod
  "http://localhost:3000", // dev
  "http://localhost:3001", // dev alt
];

// 🌐 CORS config
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked request from: ${origin}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// 🍪 Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 🔍 Utility to load all route files
function getAllRouteFiles(dir: string): string[] {
  let results: string[] = [];

  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(getAllRouteFiles(filePath));
    } else if (file.endsWith(".ts") || file.endsWith(".js")) {
      results.push(filePath);
    }
  });

  return results;
}

// 🚀 Dynamic route loading
const loadRoutes = async () => {
  const routesPath = path.join(__dirname, "routes");
  const routeFiles = getAllRouteFiles(routesPath);

  await Promise.all(
    routeFiles.map(async (filePath) => {
      try {
        const route = await import(pathToFileURL(filePath).href);
        const handler = route.default;

        if (typeof handler === "function") {
          app.use("/api/v1", handler);
          console.log(
            `✅ Loaded /api/v1 from ${path.relative(__dirname, filePath)}`
          );
        } else {
          console.warn(`⚠️ Skipped: ${filePath} does not export a router`);
        }
      } catch (error) {
        console.error(`❌ Failed to load ${filePath}:`, error);
      }
    })
  );
};

// 🏁 Start server
const startServer = async () => {
  await loadRoutes();

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
};

startServer();
