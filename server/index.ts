// server/index.ts
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import { mineToken } from "./firebase"; // your Cloud Function mining logic

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ CORS for backend API
app.use(cors());

// ✅ Fix MIME type handling for JavaScript modules
app.use((req, res, next) => {
  if (req.url.endsWith('.js') || req.url.endsWith('.mjs')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  } else if (req.url.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
  } else if (req.url.endsWith('.json')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

// ✅ Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// 🔹 Health check route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Mining backend running ✅" });
});

// 🔹 Cloud Function endpoint for mining
app.post("/api/mine", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    await mineToken(userId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Mine failed:", err);
    return res.status(500).json({ error: "Mining failed" });
  }
});

// (Optional) automatic loop to mine for all active miners
setInterval(async () => {
  // fetch active miners from Firestore and call mineToken(userId)
  // leave empty if client triggers mining via /api/mine
}, 10000); // every 10s

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT from .env or default 8080
  const port = parseInt(process.env.PORT || '8080', 10);

  // Listen on localhost to avoid ENOTSUP error on 0.0.0.0
  server.listen(port, "127.0.0.1", () => {
    log(`serving on http://127.0.0.1:${port} ✅`);
  });
})();
