import { db } from "./firebase";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export async function claimDailyReward(uid: string) {
  const ref = doc(db, "dailyRewards", uid);
  const snap = await getDoc(ref);
  const now = Date.now();

  let claimedCount = 0;
  let lastClaim = new Date(0);

  // 👤 First-time user
  if (!snap.exists()) {
    await setDoc(ref, {
      claimedCount: 0,
      lastClaim: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } else {
    const data = snap.data();
    claimedCount =
      typeof data.claimedCount === "number" ? data.claimedCount : 0;
    lastClaim = data.lastClaim?.toDate
      ? data.lastClaim.toDate()
      : new Date(0);
  }

  // 🔄 Reset if 24h passed
  if (now - lastClaim.getTime() > 24 * 60 * 60 * 1000) {
    claimedCount = 0;
  }

  // 🚫 Limit reached
  if (claimedCount >= 10) {
    return {
      status: "error",
      message: "Daily reward limit reached. Try after 24h",
    };
  }

  claimedCount += 1;

  // ✅ Update daily reward doc
  await updateDoc(ref, {
    claimedCount,
    lastClaim: serverTimestamp(),
  });

  // 💰 Add 0.1 Pall to wallet
  const walletRef = doc(db, "wallets", uid);
  const walletSnap = await getDoc(walletRef);

  const currentBalance =
    walletSnap.exists() &&
    typeof walletSnap.data().pallBalance === "number"
      ? walletSnap.data().pallBalance
      : 0;

  await updateDoc(walletRef, {
    pallBalance: currentBalance + 0.1,
  });

  return { status: "success" };
}
