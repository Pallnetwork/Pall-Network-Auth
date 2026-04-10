import { db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// ✅ Get direct referrals (F1 users list)
export async function getReferralUsers(userId: string) {
  try {
    const q = query(
      collection(db, "users"),
      where("referredBy", "==", userId)
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("❌ Referral users fetch error:", error);
    return [];
  }
}

// ✅ Get referral summary
export async function getReferralData(userId: string) {
  try {
    const users = await getReferralUsers(userId);

    return {
      f1Commission: 0,
      f2Commission: 0,
      totalCommission: 0,
      referredUsers: users,
      totalReferrals: users.length,
    };
  } catch (error) {
    console.error("❌ Referral fetch error:", error);
    return null;
  }
}

// ✅ ADDED: Find user by referral code
export async function handleReferralOnInstall({ ref }: { ref: string }) {
  try {
    const q = query(
      collection(db, "users"),
      where("referralCode", "==", ref)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      console.warn("❌ Invalid referral code");
      return null;
    }

    const refUser = snap.docs[0];
    console.log("✅ Referral matched:", refUser.id);

    return refUser.id; // 👈 UID return hoga
  } catch (error) {
    console.error("❌ Referral lookup error:", error);
    return null;
  }
}

// 🔧 FIXED: referral link now includes code
export function generateReferralLink(referralCode: string) {
  const baseLink = "https://play.google.com/store/apps/details?id=com.pall.network";
  return `${baseLink}&ref=${referralCode}`; // ✅ ADDED ref param
}

// ✅ Generate full share message
export function generateReferralMessage(referralCode: string) {
  const link = generateReferralLink(referralCode);

  return `Join PALL NETWORK 🚀 Download App: ${link}\nUse my referral code: ${referralCode}`;
}