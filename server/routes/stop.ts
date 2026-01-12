// server/routes/stop.ts
import express from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import { db } from "../firebase";
import admin from "firebase-admin";

const router = express.Router();

router.post("/", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const walletRef = db.collection("wallets").doc(uid);

    // 🔑 SESSION 4 RULE: always read from Firestore
    const walletSnap = await walletRef.get();
    if (!walletSnap.exists) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    const wallet = walletSnap.data()!;

    // ❌ If mining not active
    if (!wallet.miningActive || !wallet.lastStart) {
      return res.status(400).json({ error: "Mining not active" });
    }

    // ⏱️ Duration calculation
    const startDate = wallet.lastStart.toDate();
    const endDate = new Date();

    const durationSeconds = Math.floor(
      (endDate.getTime() - startDate.getTime()) / 1000
    );

    if (durationSeconds <= 0) {
      return res.status(400).json({ error: "Invalid mining duration" });
    }

    // 💰 EARNING FORMULA
    // 1 PALL = 24 hours = 86400 seconds
    const miningSpeed = wallet.miningSpeed ?? 1;
    const earned = (durationSeconds / 86400) * miningSpeed;

    const nowTs = admin.firestore.Timestamp.now();

    // 💾 Update wallet (SESSION 4 core)
    await walletRef.update({
      pallBalance: admin.firestore.FieldValue.increment(earned),
      totalEarnings: admin.firestore.FieldValue.increment(earned),
      miningActive: false,
      lastStart: null,
      lastMinedAt: nowTs,
    });

    // 🧾 Save mining history
    await db.collection("miningHistory").add({
      userId: uid,
      startedAt: wallet.lastStart,
      endedAt: nowTs,
      earned,
      durationSeconds,
      miningSpeed,
      createdAt: nowTs,
    });

    return res.json({
      success: true,
      message: "Mining stopped & earnings saved",
      earned,
      durationSeconds,
    });

  } catch (e) {
    console.error("SESSION 4 stop mining error:", e);
    return res.status(500).json({ error: "Stop mining failed" });
  }
});

export default router;
