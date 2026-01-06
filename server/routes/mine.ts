// server/routes/mine.ts
import express from "express";
import { auth, mineTokenSecure } from "../firebase";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const result = await mineTokenSecure(uid);
    return res.json({ message: "Mining successful", result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;