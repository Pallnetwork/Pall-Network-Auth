import express from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import { db } from "../firebase";
import admin from "firebase-admin";

const router = express.Router();

router.post("/", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = (req as any).user.uid;

    const ref = db.collection("wallets").doc(uid);

    await ref.update({
      miningActive: false,
      lastMinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: "Mining stopped" });
  } catch (e) {
    res.status(500).json({ error: "Stop mining failed" });
  }
});

export default router;
