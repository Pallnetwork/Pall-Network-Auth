import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

// Default commission rates (fallback)
let F1_RATE = 0.05;
let F2_RATE = 0.025;

// Load commission rates from Firebase settings
const loadCommissionRates = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "config"));
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      if (settings?.referral) {
        F1_RATE = settings.referral.f1 ?? F1_RATE;
        F2_RATE = settings.referral.f2 ?? F2_RATE;
      }
    }
  } catch (error) {
    console.error("❌ Failed to load commission rates:", error);
  }
};

// Call this AFTER user buys a package
export const distributeReferralCommission = async (
  buyerId: string,
  packagePrice: number
) => {
  try {
    await loadCommissionRates();

    // 1️⃣ Get buyer
    const buyerRef = doc(db, "users", buyerId);
    const buyerSnap = await getDoc(buyerRef);

    if (!buyerSnap.exists()) {
      console.log("❌ Buyer not found");
      return { success: false };
    }

    const buyerData = buyerSnap.data();

    // ✅ FIX: correct field name
    const f1Username = buyerData.referredBy;

    // ✅ Invitation OPTIONAL → safe exit
    if (!f1Username) {
      console.log("ℹ No referral found, skipping commission");
      return { success: true };
    }

    // 2️⃣ Find F1 user
    const f1Query = query(
      collection(db, "users"),
      where("username", "==", f1Username)
    );
    const f1Snap = await getDocs(f1Query);

    if (f1Snap.empty) {
      console.log("❌ F1 user not found");
      return { success: false };
    }

    const f1Doc = f1Snap.docs[0];
    const f1Id = f1Doc.id;
    const f1Commission = packagePrice * F1_RATE;

    // 3️⃣ Update F1 wallet
    const f1WalletRef = doc(db, "wallets", f1Id);
    const f1WalletSnap = await getDoc(f1WalletRef);
    const f1Balance = f1WalletSnap.exists()
      ? f1WalletSnap.data().usdtBalance || 0
      : 0;

    await setDoc(
      f1WalletRef,
      { usdtBalance: f1Balance + f1Commission },
      { merge: true }
    );

    // Track F1 commission
    const f1ReferralRef = doc(db, "referrals", f1Id);
    const f1ReferralSnap = await getDoc(f1ReferralRef);

    await setDoc(
      f1ReferralRef,
      {
        f1Commission:
          (f1ReferralSnap.exists()
            ? f1ReferralSnap.data().f1Commission || 0
            : 0) + f1Commission,
        totalCommission:
          (f1ReferralSnap.exists()
            ? f1ReferralSnap.data().totalCommission || 0
            : 0) + f1Commission,
      },
      { merge: true }
    );

    console.log(`✅ F1 commission added: ${f1Commission} USDT`);

    // 4️⃣ F2 logic (optional)
    const f1Data = f1Doc.data();
    let f2Commission = 0;

    if (f1Data.referredBy) {
      const f2Query = query(
        collection(db, "users"),
        where("username", "==", f1Data.referredBy)
      );
      const f2Snap = await getDocs(f2Query);

      if (!f2Snap.empty) {
        const f2Doc = f2Snap.docs[0];
        const f2Id = f2Doc.id;
        f2Commission = packagePrice * F2_RATE;

        const f2WalletRef = doc(db, "wallets", f2Id);
        const f2WalletSnap = await getDoc(f2WalletRef);
        const f2Balance = f2WalletSnap.exists()
          ? f2WalletSnap.data().usdtBalance || 0
          : 0;

        await setDoc(
          f2WalletRef,
          { usdtBalance: f2Balance + f2Commission },
          { merge: true }
        );

        const f2ReferralRef = doc(db, "referrals", f2Id);
        const f2ReferralSnap = await getDoc(f2ReferralRef);

        await setDoc(
          f2ReferralRef,
          {
            f2Commission:
              (f2ReferralSnap.exists()
                ? f2ReferralSnap.data().f2Commission || 0
                : 0) + f2Commission,
            totalCommission:
              (f2ReferralSnap.exists()
                ? f2ReferralSnap.data().totalCommission || 0
                : 0) + f2Commission,
          },
          { merge: true }
        );

        console.log(`✅ F2 commission added: ${f2Commission} USDT`);
      }
    }

    return {
      success: true,
      f1Commission,
      f2Commission,
    };
  } catch (error: any) {
    console.error("🔥 Referral commission error:", error);
    return { success: false, error: error?.message || "Unknown error" };
  }
};
