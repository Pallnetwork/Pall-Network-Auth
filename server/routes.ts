import type { Express } from "express";
import { createServer, type Server } from "http";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function registerRoutes(app: Express): Promise<Server> {

  // 🎬 MARK AD AS COMPLETED
  app.post("/api/mining/ad-complete", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const walletRef = doc(db, "wallets", userId);
      const walletSnap = await getDoc(walletRef);

      if (!walletSnap.exists()) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      await updateDoc(walletRef, {
        adWatched: true,
      });

      // 🔁 AUTO RESET if old mining completed (24h passed)
      if (wallet.miningActive && wallet.lastStart) {
        const elapsed = Date.now() - wallet.lastStart;

        if (elapsed >= ONE_DAY_MS) {
          await updateDoc(walletRef, {
            miningActive: false,
            lastStart: null,
          });
        }
      }

      return res.json({ success: true, message: "Ad verified successfully" });
    } catch (err) {
      console.error("Ad verification error:", err);
      return res.status(500).json({ error: "Failed to verify ad" });
    }
  });

  // 🔥 START MINING
  app.post("/api/mining/start", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const walletRef = doc(db, "wallets", userId);
      const walletSnap = await getDoc(walletRef);

      if (!walletSnap.exists()) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      const wallet = walletSnap.data();

      // ❌ Check if user watched ad
      if (!wallet.adWatched) {
        return res.status(400).json({ error: "Please watch reward ad before starting mining" });
      }

      if (wallet.miningActive === true) {
        return res.status(400).json({ error: "Mining already active" });
      }

      await updateDoc(walletRef, {
        miningActive: true,
        lastStart: Date.now(),
        adWatched: false, // Reset ad flag for next mining
      });

      return res.json({ success: true, message: "Mining started" });
    } catch (err) {
      console.error("Start mining error:", err);
      return res.status(500).json({ error: "Failed to start mining" });
    }
  });

  // 🪙 CLAIM MINING REWARD
  app.post("/api/mining/claim", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const walletRef = doc(db, "wallets", userId);
      const walletSnap = await getDoc(walletRef);

      if (!walletSnap.exists()) {
        return res.status(404).json({ error: "Wallet not found" });
      }

      const wallet = walletSnap.data();

      if (!wallet.miningActive || !wallet.lastStart) {
        return res.status(400).json({ error: "Mining not active" });
      }

      const elapsed = Date.now() - wallet.lastStart;

      if (elapsed < ONE_DAY_MS) {
        return res.status(400).json({
          error: "Mining not completed",
          remainingMs: ONE_DAY_MS - elapsed,
        });
      }

      // ✅ 1 PALL per 24 hours
      await updateDoc(walletRef, {
        pallBalance: increment(1),
        totalEarnings: increment(1),
        miningActive: false,
        lastStart: null,
      });

      return res.json({
        success: true,
        reward: 1,
        message: "1 PALL token credited",
      });
    } catch (err) {
      console.error("Claim mining error:", err);
      return res.status(500).json({ error: "Failed to claim mining reward" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
