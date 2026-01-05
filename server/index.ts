import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import mineRoute from "./routes/mine";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use("/api", mineRoute);

app.use((req, res, next) => {
  if (req.url.endsWith(".js") || req.url.endsWith(".mjs")) res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  else if (req.url.endsWith(".css")) res.setHeader("Content-Type", "text/css; charset=utf-8");
  else if (req.url.endsWith(".json")) res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  let capturedJson: any;
  const origJson = res.json;
  res.json = function (body: any, ...args: any[]) { capturedJson = body; return origJson.apply(res, [body, ...args]); };
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      let line = ${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms;
      if (capturedJson) line += ` :: ${JSON.stringify(capturedJson)}`;
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
    }
  });
  next();
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", message: "Mining backend running ✅" }));

(async () => {
  const server = await registerRoutes(app);
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") await setupVite(app, server);
  else serveStatic(app);

  const port = parseInt(process.env.PORT || "8082", 10);
  server.listen(port, "0.0.0.0", () => log(serving on port ${port} ✅));
})();