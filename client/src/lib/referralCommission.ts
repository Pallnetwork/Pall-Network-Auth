import { doc, getDoc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "./firebase";

// Commission rates - default
let F1_RATE = 0.05;
let F2_RATE = 0.025;

// Load commission rates from Firebase settings
const loadCommissionRates = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "config"));
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      if (settings.referral) {
        F1_RATE = settings.referral.f1 || 0.05;
        F2_RATE = settings.referral.f2 || 0.025;
      }
    }
  } catch (error) {
    console.error("Error loading commission rates:", error);
  }
};

// Run this after user buys a package
export const distributeReferralCommission = async (buyerId: string, packagePrice: number) => {
  try {
    await loadCommissionRates();

    // 🔹 1️⃣ Get buyer doc
    const buyerRef = doc(db, "users", buyerId);
    const buyerSnap = await getDoc(buyerRef);
    if (!buyerSnap.exists()) return console.log("❌ Buyer not found");

    const buyerData = buyerSnap.data();
    const f1Id = buyerData.referredBy; // Direct referrer UID

    if (!f1Id) return console.log("ℹ No referrer for this buyer");

    // 🔹 2️⃣ F1 - direct referrer
    const f1Ref = doc(db, "users", f1Id);
    const f1Snap = await getDoc(f1Ref);
    if (!f1Snap.exists()) return console.log("❌ F1 user not found");

    const f1Data = f1Snap.data();
    const f1WalletRef = doc(db, "wallets", f1Id);
    const f1Commission = packagePrice * F1_RATE;

    // Update F1 wallet
    const f1WalletSnap = await getDoc(f1WalletRef);
    const currentF1Balance = f1WalletSnap.exists() ? (f1WalletSnap.data().usdtBalance || 0) : 0;
    await setDoc(f1WalletRef, { usdtBalance: currentF1Balance + f1Commission }, { merge: true });

    // Update F1 referral doc
    const f1ReferralRef = doc(db, "referrals", f1Id);
    const f1ReferralSnap = await getDoc(f1ReferralRef);
    const currentF1Commission = f1ReferralSnap.exists() ? (f1ReferralSnap.data().f1Commission || 0) : 0;
    const currentTotal = f1ReferralSnap.exists() ? (f1ReferralSnap.data().totalCommission || 0) : 0;

    await setDoc(f1ReferralRef, {
      f1Commission: currentF1Commission + f1Commission,
      totalCommission: currentTotal + f1Commission,
      referredUsers: f1ReferralSnap.exists()
        ? Array.from(new Set([...f1ReferralSnap.data().referredUsers, buyerId]))
        : [buyerId],
    }, { merge: true });

    console.log(`✅ F1 Commission ${f1Commission} USDT added to ${f1Id}`);

    // 🔹 3️⃣ F2 - referrer of F1
    const f2Id = f1Data.referredBy;
    if (f2Id) {
      const f2Ref = doc(db, "users", f2Id);
      const f2Snap = await getDoc(f2Ref);
      if (!f2Snap.exists()) return console.log("ℹ F2 user not found");

      const f2WalletRef = doc(db, "wallets", f2Id);
      const f2Commission = packagePrice * F2_RATE;

      // Update F2 wallet
      const f2WalletSnap = await getDoc(f2WalletRef);
      const currentF2Balance = f2WalletSnap.exists() ? (f2WalletSnap.data().usdtBalance || 0) : 0;
      await setDoc(f2WalletRef, { usdtBalance: currentF2Balance + f2Commission }, { merge: true });

      // Update F2 referral doc
      const f2ReferralRef = doc(db, "referrals", f2Id);
      const f2ReferralSnap = await getDoc(f2ReferralRef);
      const currentF2Commission = f2ReferralSnap.exists() ? (f2ReferralSnap.data().f2Commission || 0) : 0;
      const currentF2Total = f2ReferralSnap.exists() ? (f2ReferralSnap.data().totalCommission || 0) : 0;

      await setDoc(f2ReferralRef, {
        f2Commission: currentF2Commission + f2Commission,
        totalCommission: currentF2Total + f2Commission,
      }, { merge: true });

      console.log(`✅ F2 Commission ${f2Commission} USDT added to ${f2Id}`);
    }

    return {
      success: true,
      f1Commission,
      f2Commission: f2Id ? packagePrice * F2_RATE : 0,
    };

  } catch (error: any) {
    console.error("🔥 Error distributing commission:", error);
    return { success: false, error: error?.message || "Unknown error" };
  }
};