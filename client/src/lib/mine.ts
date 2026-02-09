// lib/mine.ts
import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";

// 🔹 Wait for Firebase user reliably
async function waitForAuthUser(maxRetries = 5, delay = 1500): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const user = auth.currentUser;
    if (user) return user;
    await new Promise((res) => setTimeout(res, delay));
  }

  return new Promise((resolve, reject) => {
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      if (user) resolve(user);
      else reject(new Error("No Firebase user found after retries"));
    });
  });
}

export async function mineForUser() {
  try {
    const user = auth.currentUser ?? (await waitForAuthUser());
    if (!user) return { status: "error", message: "User not authenticated" };

    const walletRef = doc(db, "wallets", user.uid);
    const walletSnap = await getDoc(walletRef);
    const walletData = walletSnap.data() || {};

    const lastStart = walletData.lastStart?.toMillis?.() || walletData.lastStart || 0;
    const now = Date.now();
    const MAX_SECONDS = 24 * 60 * 60 * 1000;

    // Check 24h mining lock
    if (walletData.miningActive && now - lastStart < MAX_SECONDS) {
      return { status: "error", message: "Mining already active. Try again later." };
    }

    // Start mining
    await updateDoc(walletRef, {
      miningActive: true,
      lastStart: serverTimestamp(),
      lastMinedAt: walletData.lastMinedAt || serverTimestamp(),
    });

    console.log("✅ Mining started for user:", user.uid);
    return { status: "success" };
  } catch (err: any) {
    console.error("🔥 Mining API call failed:", err);
    return { status: "error", message: err.message };
  }
}
