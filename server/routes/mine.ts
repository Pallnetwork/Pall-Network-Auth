// server/routes/mine.ts
import express from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import admin, { db } from "../firebase";

const router = express.Router();

const COOLDOWN_HOURS = 24;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

router.post("/", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const walletRef = db.collection("wallets").doc(uid);
    const snap = await walletRef.get();
    const now = Date.now();

    // ✅ First-time user: wallet create & mining start
    if (!snap.exists) {
      await walletRef.set({
        pallBalance: 0,
        miningActive: true,
        lastStart: admin.firestore.FieldValue.serverTimestamp(),
        lastMinedAt: admin.firestore.FieldValue.serverTimestamp(),
        miningSpeed: 1,
        totalEarnings: 0,
        usdtBalance: 0,
        currentPackage: "free",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.json({ success: true, message: "Mining started (first-time user)" });
    }

    const data = snap.data()!;
    const lastStart = data.lastStart?.toDate?.() ?? null;

    // ✅ Mining already active
    if (data.miningActive === true) {
      return res.status(400).json({ error: "Mining already active" });
    }

    // ✅ Cooldown check
    if (lastStart && now - lastStart.getTime() < COOLDOWN_MS) {
      const remainingMinutes = Math.ceil((COOLDOWN_MS - (now - lastStart.getTime())) / 60000);
      return res.status(400).json({ error: "Cooldown active", remainingMinutes });
    }

    // ✅ Start mining for existing user
    await walletRef.update({
      miningActive: true,
      lastStart: admin.firestore.FieldValue.serverTimestamp(),
      lastMinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, message: "Mining session started" });
  } catch (err) {
    console.error("SESSION 3 mining error:", err);
    return res.status(500).json({ error: "Mining failed" });
  }
});

export default router;