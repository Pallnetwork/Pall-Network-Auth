import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// Commission rates - will be overridden by Firebase settings
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
    // Load current commission rates
    await loadCommissionRates();

    // 1. Get buyer user document
    const buyerRef = doc(db, "users", buyerId);
    const buyerSnap = await getDoc(buyerRef);

    if (!buyerSnap.exists()) return console.log("❌ Buyer not found");

    const buyerData = buyerSnap.data();
    const f1Username = buyerData.referralBy; // Direct referrer username

    if (!f1Username) return console.log("ℹ No referrer found for this buyer");

    // 2. Find F1 user (direct referrer) by username
    const f1Query = query(collection(db, "users"), where("username", "==", f1Username));
    const f1Snap = await getDocs(f1Query);
    
    if (f1Snap.empty) return console.log("❌ F1 user not found");

    const f1Doc = f1Snap.docs[0];
    const f1Id = f1Doc.id;
    const f1Commission = packagePrice * F1_RATE;

    // 3. Update F1 wallet and referral data
    const f1WalletRef = doc(db, "wallets", f1Id);
    const f1WalletSnap = await getDoc(f1WalletRef);
    const currentF1Balance = f1WalletSnap.exists() ? (f1WalletSnap.data().usdtBalance || 0) : 0;
    
    await setDoc(f1WalletRef, {
      usdtBalance: currentF1Balance + f1Commission
    }, { merge: true });

    // Update F1 referral commission tracking
    const f1ReferralRef = doc(db, "referrals", f1Id);
    const f1ReferralSnap = await getDoc(f1ReferralRef);
    const currentF1Commission = f1ReferralSnap.exists() ? (f1ReferralSnap.data().f1Commission || 0) : 0;
    
    await setDoc(f1ReferralRef, {
      f1Commission: currentF1Commission + f1Commission,
      totalCommission: (f1ReferralSnap.exists() ? f1ReferralSnap.data().totalCommission || 0 : 0) + f1Commission
    }, { merge: true });

    console.log(`✅ F1 Commission ${f1Commission} USDT added to ${f1Id}`);

    // 4. Find F2 (referrer of F1)
    const f1Data = f1Doc.data();
    if (f1Data.referralBy) {
      const f2Query = query(collection(db, "users"), where("username", "==", f1Data.referralBy));
      const f2Snap = await getDocs(f2Query);
      
      if (!f2Snap.empty) {
        const f2Doc = f2Snap.docs[0];
        const f2Id = f2Doc.id;
        const f2Commission = packagePrice * F2_RATE;

        // Update F2 wallet
        const f2WalletRef = doc(db, "wallets", f2Id);
        const f2WalletSnap = await getDoc(f2WalletRef);
        const currentF2Balance = f2WalletSnap.exists() ? (f2WalletSnap.data().usdtBalance || 0) : 0;
        
        await setDoc(f2WalletRef, {
          usdtBalance: currentF2Balance + f2Commission
        }, { merge: true });

        // Update F2 referral commission tracking
        const f2ReferralRef = doc(db, "referrals", f2Id);
        const f2ReferralSnap = await getDoc(f2ReferralRef);
        const currentF2Commission = f2ReferralSnap.exists() ? (f2ReferralSnap.data().f2Commission || 0) : 0;
        
        await setDoc(f2ReferralRef, {
          f2Commission: currentF2Commission + f2Commission,
          totalCommission: (f2ReferralSnap.exists() ? f2ReferralSnap.data().totalCommission || 0 : 0) + f2Commission
        }, { merge: true });

        console.log(`✅ F2 Commission ${f2Commission} USDT added to ${f2Id}`);
      }
    }

    return {
      success: true,
      f1Commission,
      f2Commission: f1Data.referralBy ? packagePrice * F2_RATE : 0
    };

  } catch (error: any) {
    console.error("🔥 Error distributing commission:", error);
    return { success: false, error: error?.message || "Unknown error" };
  }
};
