// server/index.ts
import express from "express";
import cors from "cors";
import mineRouter from "./routes/mine";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Mining backend running ✅" });
});
app.use("/api/mine", mineRouter);

// ✅ Serve frontend in production
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "client/dist")));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});