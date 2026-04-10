import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  collection
} from "firebase/firestore";
import { db } from "./firebase";

// Commission rates
let F1_RATE = 0.05;
let F2_RATE = 0.025;

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

// ===============================
// 🚀 MAIN FUNCTION
// ===============================
export const distributeReferralCommission = async (
  buyerId: string,
  packagePrice: number
) => {
  try {
    await loadCommissionRates();

    const buyerRef = doc(db, "users", buyerId);
    const buyerSnap = await getDoc(buyerRef);

    if (!buyerSnap.exists()) return;

    const buyerData = buyerSnap.data();
    const f1Id = buyerData.referredBy;

    if (!f1Id) return;

    const f1Commission = packagePrice * F1_RATE;

    // ===============================
    // 🔥 F1 COMMISSION
    // ===============================
    const f1WalletRef = doc(db, "wallets", f1Id);

    await updateDoc(f1WalletRef, {
      usdtBalance: increment(f1Commission),
    }).catch(() => {
      setDoc(f1WalletRef, { usdtBalance: f1Commission }, { merge: true });
    });

    const f1ReferralRef = doc(db, "referrals", f1Id);

    await setDoc(
      f1ReferralRef,
      {
        f1Commission: increment(f1Commission),
        totalCommission: increment(f1Commission),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // ===============================
    // 🔥 SAFE COMMISSION LOG (SPARK OPTIMIZED)
    // user-based subcollection
    // ===============================
    const logRef = doc(
      collection(db, "commissionLogs", f1Id, "logs")
    );

    await setDoc(logRef, {
      buyerId,
      f1Id,
      packagePrice,
      f1Commission,
      f2Commission: 0,
      createdAt: serverTimestamp(),
    });

    // ===============================
    // 🔥 F2 COMMISSION (SAFE)
    // ===============================
    const f1Snap = await getDoc(f1RefSafe(f1Id));
    const f2Id = f1Snap.exists() ? f1Snap.data()?.referredBy : null;

    if (f2Id) {
      const f2Commission = packagePrice * F2_RATE;

      const f2WalletRef = doc(db, "wallets", f2Id);

      await updateDoc(f2WalletRef, {
        usdtBalance: increment(f2Commission),
      }).catch(() => {
        setDoc(f2WalletRef, { usdtBalance: f2Commission }, { merge: true });
      });

      const f2ReferralRef = doc(db, "referrals", f2Id);

      await setDoc(
        f2ReferralRef,
        {
          f2Commission: increment(f2Commission),
          totalCommission: increment(f2Commission),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // ===============================
      // 🔥 F2 LOG
      // ===============================
      const f2LogRef = doc(
        collection(db, "commissionLogs", f2Id, "logs")
      );

      await setDoc(f2LogRef, {
        buyerId,
        f1Id,
        f2Id,
        packagePrice,
        f1Commission: 0,
        f2Commission,
        createdAt: serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Commission error:", error);
    return { success: false, error: error.message };
  }
};

// ===============================
// helper (safe F1 fetch wrapper)
// ===============================
const f1RefSafe = (f1Id: string) => doc(db, "users", f1Id);