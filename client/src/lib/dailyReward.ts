// lib/dailyReward.ts
import { db } from "./firebase";
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, increment } from "firebase/firestore";

export async function claimDailyReward(uid: string) {
  const ref = doc(db, "dailyRewards", uid);
  const snap = await getDoc(ref);

  const now = new Date();
  // Convert to UTC+5 reset time
  const utc5Date = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  utc5Date.setHours(0, 0, 0, 0);

  if (!snap.exists()) {
    // Initialize doc
    await setDoc(ref, {
      claimedCount: 1,
      lastResetDate: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    // Add 0.1 Pall to wallet safely
    const walletRef = doc(db, "wallets", uid);
    await updateDoc(walletRef, {
      pallBalance: increment(0.1),
    });

    return { status: "success" };
  }

  const data = snap.data();
  let claimedCount = typeof data.claimedCount === "number" ? data.claimedCount : 0;
  const lastReset = data.lastResetDate?.toDate?.() || new Date(0);

  // Reset claimedCount if day has changed (UTC+5)
  if (lastReset < utc5Date) {
    claimedCount = 0;
    await updateDoc(ref, { claimedCount: 0, lastResetDate: serverTimestamp() });
  }

  if (claimedCount >= 10) {
    return { status: "error", message: "Daily reward limit reached. Try again tomorrow" };
  }

  claimedCount += 1;

  await updateDoc(ref, {
    claimedCount,
    lastResetDate: serverTimestamp(),
  });

  // Increment wallet safely
  const walletRef = doc(db, "wallets", uid);
  await updateDoc(walletRef, {
    pallBalance: increment(0.1),
  });

  return { status: "success" };
}
