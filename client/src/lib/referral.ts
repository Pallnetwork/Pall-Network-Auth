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

// ✅ Get referral summary (SAFE for current DB structure)
export async function getReferralData(userId: string) {
  try {
    // 🔥 Direct referrals (F1)
    const users = await getReferralUsers(userId);

    return {
      f1Commission: 0, // future use
      f2Commission: 0, // future use
      totalCommission: 0, // future use
      referredUsers: users,
      totalReferrals: users.length,
    };
  } catch (error) {
    console.error("❌ Referral fetch error:", error);
    return null;
  }
}

// ✅ Generate share link
export function generateReferralLink(referralCode: string) {
  const baseLink = "https://play.google.com/store/apps/details?id=com.pall.network";
  return baseLink;
}

// ✅ Generate full share message
export function generateReferralMessage(referralCode: string) {
  const link = generateReferralLink(referralCode);

  return `Join PALL NETWORK 🚀 Download App: ${link}\nUse my referral code: ${referralCode}`;
}