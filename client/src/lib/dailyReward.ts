// lib/dailyReward.ts
import { db } from "./firebase";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, increment } from "firebase/firestore";

/**
 * claimDailyReward:
 * - Allows max 10 claims per user per UTC+5 day.
 * - Resets count at UTC+5 midnight.
 * - Safely increments user's pallBalance.
 */
export async function claimDailyReward(uid: string) {
  if (!uid) throw new Error("User not authenticated");

  const ref = doc(db, "dailyRewards", uid);
  const snap = await getDoc(ref);

  const now = new Date();

  // Compute current UTC+5 date start
  const utc5Now = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const utc5DayStart = new Date(utc5Now);
  utc5DayStart.setUTCHours(0, 0, 0, 0);

  // First-time claim
  if (!snap.exists()) {
    await setDoc(ref, {
      claimedCount: 1,
      lastResetDate: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    const walletRef = doc(db, "wallets", uid);
    await updateDoc(walletRef, { pallBalance: increment(0.1) });

    return { status: "success", claimedCount: 1 };
  }

  const data = snap.data();
  let claimedCount = typeof data.claimedCount === "number" ? data.claimedCount : 0;
  const lastReset = data.lastResetDate?.toDate?.() || new Date(0);

  // Reset claimedCount if UTC+5 day has changed
  if (lastReset < utc5DayStart) {
    claimedCount = 0;
    await updateDoc(ref, { claimedCount: 0, lastResetDate: serverTimestamp() });
  }

  if (claimedCount >= 10) {
    return { status: "error", message: "Daily reward limit reached. Try again tomorrow" };
  }

  // Increment claim count
  claimedCount += 1;
  await updateDoc(ref, {
    claimedCount,
    lastResetDate: serverTimestamp(),
  });

  // Increment wallet safely
  const walletRef = doc(db, "wallets", uid);
  await updateDoc(walletRef, { pallBalance: increment(0.1) });

  return { status: "success", claimedCount };
}
