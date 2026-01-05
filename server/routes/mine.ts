import { Router, Request, Response } from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import * as admin from "../firebase";

const router = Router();
const COOLDOWN_HOURS = 24;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

router.post("/mine", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const db = admin.firestore();
    const walletRef = db.collection("wallets").doc(uid);
    const snap = await walletRef.get();
    const now = Date.now();

    if (!snap.exists) {
      await walletRef.set({
        pallBalance: 0,
        miningActive: true,
        lastStart: admin.firestore.FieldValue.serverTimestamp(),
        lastMinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.json({ success: true, message: "Mining started (first time)" });
    }

    const data = snap.data()!;
    const lastStart = data.lastStart?.toDate?.() ?? null;
    const miningActive = data.miningActive === true;

    if (miningActive) return res.status(400).json({ error: "Mining already active" });
    if (lastStart && now - lastStart.getTime() < COOLDOWN_MS) {
      const remainingMinutes = Math.ceil((COOLDOWN_MS - (now - lastStart.getTime())) / 60000);
      return res.status(400).json({ error: "Cooldown active", remainingMinutes });
    }

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