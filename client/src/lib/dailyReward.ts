// client/src/lib/dailyReward.ts
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

interface ClaimResult {
  status: "success" | "error";
  message?: string;
  data?: {
    newCount: number;
  };
}

/**
 * claimDailyReward
 * 
 * Handles the daily reward logic:
 * - Max 10 rewards per day
 * - Adds 0.1 Pall to user balance
 * - Resets count after 24 hours
 */
export const claimDailyReward = async (uid: string): Promise<ClaimResult> => {
  if (!uid) {
    return { status: "error", message: "User not authenticated" };
  }

  const dailyRef = doc(db, "dailyRewards", uid);
  const walletRef = doc(db, "wallets", uid);

  try {
    const snap = await getDoc(dailyRef);
    const now = Date.now();

    let claimedCount = 0;
    let lastClaimAt: number | null = null;

    if (snap.exists()) {
      const data = snap.data();
      claimedCount = data.claimedCount || 0;
      lastClaimAt = data.lastClaimAt?.toMillis?.() || 0;
    }

    // Check if 24h passed since first claim
    if (!lastClaimAt || now - lastClaimAt > 24 * 60 * 60 * 1000) {
      claimedCount = 0;
      lastClaimAt = null;
    }

    if (claimedCount >= 10) {
      return { status: "error", message: "Daily limit reached" };
    }

    const newCount = claimedCount + 1;

    // Update Firestore
    await setDoc(
      dailyRef,
      {
        claimedCount: newCount,
        lastClaimAt: lastClaimAt ? lastClaimAt : new Date(),
      },
      { merge: true }
    );

    // Increment wallet balance
    await updateDoc(walletRef, {
      pallBalance: increment(0.1),
    });

    return {
      status: "success",
      data: { newCount },
    };
  } catch (err: any) {
    console.error("Daily Reward Error:", err);
    return { status: "error", message: err.message || "Unknown error" };
  }
};