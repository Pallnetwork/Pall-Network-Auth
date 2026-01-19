import { db, auth } from "./firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function claimDailyReward(uid: string) {
  const ref = doc(db, "dailyRewards", uid);
  const snap = await getDoc(ref);
  const now = Date.now();

  if (!snap.exists()) {
    await updateDoc(ref, {
      claimedCount: 1,
      lastClaim: serverTimestamp(),
    }).catch(() => null);

    // Add 0.1 Pall to user wallet
    const walletRef = doc(db, "wallets", uid);
    const walletSnap = await getDoc(walletRef);
    const currentBalance = walletSnap.exists() && typeof walletSnap.data().pallBalance === "number" ? walletSnap.data().pallBalance : 0;

    await updateDoc(walletRef, {
      pallBalance: currentBalance + 0.1,
    });

    return { status: "success" };
  }

  const data = snap.data();
  let claimedCount = typeof data.claimedCount === "number" ? data.claimedCount : 0;
  const lastClaim = data.lastClaim?.toDate ? data.lastClaim.toDate() : new Date(0);

  // Reset daily reward if 24h passed
  if (now - lastClaim.getTime() > 24 * 60 * 60 * 1000) {
    claimedCount = 0;
  }

  if (claimedCount >= 10) {
    return { status: "error", message: "Daily reward limit reached. Try after 24h" };
  }

  claimedCount += 1;

  await updateDoc(ref, {
    claimedCount,
    lastClaim: serverTimestamp(),
  });

  // Add 0.1 Pall to user wallet
  const walletRef = doc(db, "wallets", uid);
  const walletSnap = await getDoc(walletRef);
  const currentBalance = walletSnap.exists() && typeof walletSnap.data().pallBalance === "number" ? walletSnap.data().pallBalance : 0;

  await updateDoc(walletRef, {
    pallBalance: currentBalance + 0.1,
  });

  return { status: "success" };
}
