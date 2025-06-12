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
function getAllRouteFiles(
  dir: string,
  baseDir: string
): { filePath: string; relativePath: string }[] {
  let results: { filePath: string; relativePath: string }[] = [];

  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(baseDir, filePath);

    if (stat.isDirectory()) {
      results = results.concat(getAllRouteFiles(filePath, baseDir));
    } else if (file.endsWith(".ts") || file.endsWith(".js")) {
      results.push({ filePath, relativePath });
    }
  });

  return results;
}

// 🚀 Dynamic route loading
const loadRoutes = async () => {
  const routesBasePath = path.join(__dirname, "routes"); // This is your 'routes' folder
  const routeFiles = getAllRouteFiles(routesBasePath, routesBasePath); // Get all files and their relative paths

  await Promise.all(
    routeFiles.map(async ({ filePath, relativePath }) => {
      try {
        const route = await import(pathToFileURL(filePath).href);
        const handler = route.default;

        if (typeof handler === "function") {
          let mountPath = "/"; // Default mount path

          // Remove file extension and 'index' if it's an index file
          let routeSegment = relativePath
            .replace(/\.(ts|js)$/, "")
            .replace(/index$/, "");

          // Clean up trailing slash if it's not the root path
          if (routeSegment !== "") {
            routeSegment = `/${routeSegment}`;
          }

          if (relativePath.startsWith(path.join("api", "v1") + path.sep)) {
            const apiRouteSegment = relativePath
              .substring((path.join("api", "v1") + path.sep).length) // Remove 'api/v1/' part
              .replace(/\.(ts|js)$/, "")
              .replace(/index$/, "");

            mountPath = `/api/v1/${apiRouteSegment}`;
            if (mountPath.endsWith("/")) {
              mountPath = mountPath.slice(0, -1); // Remove trailing slash if present
            }
            if (mountPath === "/api/v1") {
              mountPath = "/api/v1"; // Ensure /api/v1 remains /api/v1
            }

            app.use(mountPath, handler);
            console.log(
              `✅ Loaded ${mountPath} from ${path.relative(
                __dirname,
                filePath
              )}`
            );
          } else {
            app.use("/api/v1", handler);
            console.log(
              `✅ Loaded /api/v1 from ${path.relative(__dirname, filePath)}`
            );
          }
        } else {
          console.warn(`⚠️ Skipped: ${filePath} does not export a router`);
        }
      } catch (error) {
        console.error(`❌ Failed to load ${filePath}:`, error);
      }
    })
  );

  // Add a catch-all 404 handler for any unmatched routes
  app.use((req, res, next) => {
    res.status(404).json({
      message: "Not Found",
      requestedUrl: req.originalUrl,
      method: req.method,
    });
  });

  // Basic error handler
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      console.error(err.stack);
      res.status(500).send("Something broke!");
    }
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

export default app;
