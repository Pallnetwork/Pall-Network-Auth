import { Router, Request, Response } from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import * as admin from "../firebase";

const router = Router();

const COOLDOWN_HOURS = 24;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

/**
 * POST /api/mine
 * Session-3 FINAL
 */
router.post(
  "/mine",
  verifyFirebaseToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as any).user?.uid;
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const db = admin.firestore();
      const walletRef = db.collection("wallets").doc(uid);
      const snap = await walletRef.get();
      const now = Date.now();

      // 🆕 First-time user
      if (!snap.exists) {
        await walletRef.set({
          pallBalance: 0,
          miningActive: true,
          lastStart: admin.firestore.FieldValue.serverTimestamp(),
          lastMinedAt: null, // ⬅️ important
        });

        return res.json({
          success: true,
          message: "Mining started (first time)",
        });
      }

      const data = snap.data()!;
      const miningActive = data.miningActive === true;
      const lastMinedAt = data.lastMinedAt?.toDate?.() ?? null;

      // ❌ Already mining
      if (miningActive) {
        return res.status(400).json({
          error: "Mining already active",
        });
      }

      // ⏳ Cooldown check (ONLY lastMinedAt)
      if (lastMinedAt) {
        const diff = now - lastMinedAt.getTime();
        if (diff < COOLDOWN_MS) {
          const remainingMs = COOLDOWN_MS - diff;
          const remainingMinutes = Math.ceil(remainingMs / 60000);

          return res.status(400).json({
            error: "Cooldown active",
            remainingMinutes,
          });
        }
      }

      // ✅ START NEW MINING SESSION
      await walletRef.update({
        miningActive: true,
        lastStart: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({
        success: true,
        message: "Mining session started",
      });
    } catch (err) {
      console.error("SESSION 3 mining error:", err);
      return res.status(500).json({ error: "Mining failed" });
    }
  }
);

export default router;