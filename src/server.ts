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
// This helper now also returns the relative path of the file
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
          // Determine the prefix based on file path or convention
          // Example: if the file is in 'routes/api/v1/category.ts', mount it under /api/v1
          // If it's in 'routes/general/home.ts', mount it under /
          let mountPath = "/"; // Default mount path

          // Remove file extension and 'index' if it's an index file
          let routeSegment = relativePath
            .replace(/\.(ts|js)$/, "")
            .replace(/index$/, "");

          // Clean up trailing slash if it's not the root path
          if (routeSegment !== "") {
            routeSegment = `/${routeSegment}`;
          }

          // If you want ALL routes under /api/v1 regardless of folder structure
          // app.use("/api/v1", handler);
          // console.log(`✅ Loaded ${mountPath} from ${relativePath}`);

          // OR if you want to be more specific based on folder structure
          if (relativePath.startsWith(path.join("api", "v1") + path.sep)) {
            // If the route file is in 'routes/api/v1' folder
            // e.g., routes/api/v1/products.ts -> /api/v1/products
            // routes/api/v1/users/auth.ts -> /api/v1/users/auth
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
            // For other routes not under 'api/v1'
            // Example: If you have a 'routes/general/home.ts'
            // This needs to be handled differently. For simple cases,
            // you might just mount the file directly.
            // Let's assume for now, everything else goes to a general root level.
            // You might need a more sophisticated mapping here depending on your
            // desired URL structure.

            // For now, let's revert to original behavior if it's NOT in api/v1
            // Or, more likely, you'll still want to prefix it.
            // For a simple case, let's keep all API routes under /api/v1.

            // If you wanted to load /category from a file like 'routes/category.ts'
            // and it should be accessible at /category (not /api/v1/category)
            // Then you would do:
            // if (relativePath === 'category.ts') {
            //   app.use('/category', handler);
            // } else {
            //   app.use('/api/v1', handler); // Fallback for other API routes
            // }

            // To address your current 404s for /category and /product,
            // while still having the /api/v1 prefix, you MUST adjust your client
            // to request /api/v1/category and /api/v1/product.
            // Your current setup: `app.use("/api/v1", handler);` means this.

            // The simplest solution to your reported problem is:
            // 1. Ensure your router files define routes relative to their
            //    intended mount point.
            // 2. Ensure your client calls the correct prefixed URL.

            // Since your current code only uses app.use("/api/v1", handler);
            // It means that *every* router you dynamically load from your `routes` directory
            // will be mounted under the `/api/v1` prefix.

            // Let's stick with the current `app.use("/api/v1", handler);`
            // and assume the routes inside `/routes` directory define their
            // sub-paths.
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
