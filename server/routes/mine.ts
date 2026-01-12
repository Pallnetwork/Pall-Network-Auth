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

    // 🔑 SESSION 4 RULE: Firestore is the ONLY source of truth
    const snap = await walletRef.get();
    const nowMs = Date.now();

    let isNewUser = false;

    // ✅ First-time user → wallet create
    if (!snap.exists) {
      isNewUser = true;

      await walletRef.set({
        uid, // keep existing
        pallBalance: 0,
        miningActive: false,
        lastStart: null,
        lastMinedAt: null,
        miningSpeed: 1,
        totalEarnings: 0,
        usdtBalance: 0,
        currentPackage: "free",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 🔁 Always re-read wallet (SESSION 4 safety)
    const walletSnap = await walletRef.get();
    if (!walletSnap.exists) {
      return res.status(500).json({ error: "Wallet not found" });
    }

    const wallet = walletSnap.data()!;
    const lastStartDate =
      wallet.lastStart && wallet.lastStart.toDate
        ? wallet.lastStart.toDate()
        : null;

    // ❌ Mining already running
    if (wallet.miningActive === true) {
      return res.status(400).json({ error: "Mining already active" });
    }

    // ⏳ Cooldown check (existing logic preserved)
    if (!isNewUser && lastStartDate) {
      const diff = nowMs - lastStartDate.getTime();
      if (diff < COOLDOWN_MS) {
        const remainingMinutes = Math.ceil((COOLDOWN_MS - diff) / 60000);
        return res.status(400).json({
          error: "Cooldown active",
          remainingMinutes,
        });
      }
    }

    // 🚀 SESSION 4 — START MINING
    const nowTs = admin.firestore.Timestamp.now();

    await walletRef.update({
      miningActive: true,
      lastStart: nowTs,       // miningStartedAt (SESSION 4 equivalent)
      lastMinedAt: nowTs,    // used later in stop logic
    });

    return res.json({
      success: true,
      message: isNewUser
        ? "Mining started (new user)"
        : "Mining session started",
      miningStartedAt: nowTs,
    });

  } catch (err) {
    console.error("SESSION 4 mining start error:", err);
    return res.status(500).json({ error: "Mining failed" });
  }
});

export default router;
