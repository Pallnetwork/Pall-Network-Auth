import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import http from "http";
import { setupVite, serveStatic, log } from "./vite";
import mineRouter from "./routes/mine";
import stopRoutes from "./routes/stop";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Routes
app.use("/api/mine", mineRouter);
app.use("/api/stop", stopRoutes);

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", message: "Mining backend running ✅" })
);

// Logger
app.use((req, res, next) => {
  const start = Date.now();
  let capturedJson: any;

  const origJson = res.json;
  res.json = function (body: any, ...args: any[]) {
    capturedJson = body;
    return origJson.apply(res, [body, ...args]);
  };

  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      let line = `${req.method} ${req.path} ${res.statusCode} in ${
        Date.now() - start
      }ms`;
      if (capturedJson) line += ` :: ${JSON.stringify(capturedJson)}`;
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
    }
  });

  next();
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  throw err;
});

// ---- SERVER START (FINAL FIX) ----
const server = http.createServer(app);

(async () => {
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "8080", 10);
  server.listen(port, "0.0.0.0", () =>
    log(`serving on port ${port} ✅`)
  );
})();
