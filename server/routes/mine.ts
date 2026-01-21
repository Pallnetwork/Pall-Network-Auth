import express from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import admin, { db } from "../firebase";

const router = express.Router();

const COOLDOWN_HOURS = 24;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

/**
 * 🔹 Referral speed calculator
 * F1 active  → +0.1
 * F2 active  → +0.001
 */
async function calculateMiningSpeed(uid: string) {
  let speed = 1;

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return speed;

  const user = userSnap.data()!;
  const referredBy = user.referredBy;

  // 🔗 F1
  if (referredBy) {
    const f1WalletSnap = await db.collection("wallets").doc(referredBy).get();
    const f1UserSnap = await db.collection("users").doc(referredBy).get();

    if (f1WalletSnap.exists && f1UserSnap.exists) {
      const f1Wallet = f1WalletSnap.data()!;
      const f1User = f1UserSnap.data()!;

      if (f1Wallet.miningActive === true) {
        speed += 0.1;
      }

      // 🔗 F2
      if (f1User.referredBy) {
        const f2WalletSnap = await db
          .collection("wallets")
          .doc(f1User.referredBy)
          .get();

        if (f2WalletSnap.exists) {
          const f2Wallet = f2WalletSnap.data()!;
          if (f2Wallet.miningActive === true) {
            speed += 0.001;
          }
        }
      }
    }
  }

  return speed;
}

router.post("/", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = (req as any).user?.uid;
    if (!uid) return res.status(401).json({ error: "Unauthorized" });

    const walletRef = db.collection("wallets").doc(uid);
    const snap = await walletRef.get();
    const nowMs = Date.now();

    // 🆕 Create wallet if not exists
    if (!snap.exists) {
      await walletRef.set({
        uid,
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

    const walletSnap = await walletRef.get();
    const wallet = walletSnap.data()!;

    // 🔥 AUTO RESET IF 24h COMPLETED
    if (wallet.miningActive === true && wallet.lastStart) {
      const lastStartMs =
        wallet.lastStart.toDate?.().getTime() ??
        new Date(wallet.lastStart).getTime();

      const diff = nowMs - lastStartMs;

      if (diff >= COOLDOWN_MS) {
        // ✅ 24h complete → force stop mining
        await walletRef.update({
          miningActive: false,
          lastStart: null,
        });
      } else {
        // ❌ Still running
        const remainingMinutes = Math.ceil((COOLDOWN_MS - diff) / 60000);
        return res.status(400).json({
          error: "Mining already active",
          remainingMinutes,
        });
      }
    }

    // 🚀 START NEW MINING SESSION
    const nowTs = admin.firestore.Timestamp.now();
    const miningSpeed = await calculateMiningSpeed(uid);

    await walletRef.update({
      miningActive: true,
      miningSpeed,
      lastStart: nowTs,
      lastMinedAt: nowTs,
    });

    return res.json({
      success: true,
      miningSpeed,
      message: "Mining session started",
    });
  } catch (err) {
    console.error("Mining start error:", err);
    return res.status(500).json({ error: "Mining failed" });
  }
});

export default router;
