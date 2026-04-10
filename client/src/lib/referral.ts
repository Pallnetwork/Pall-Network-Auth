import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// ✅ Get direct referrals (F1 users list)
export async function getReferralUsers(userId: string) {
  try {
    const q = query(
      collection(db, "users"),
      where("referredBy", "==", userId)
    );

    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
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

// 🔥 FIXED: Handle referral lookup (100% working)
export async function handleReferralOnInstall({
  ref,
}: {
  ref: string;
}) {
  try {
    const cleanRef = ref.trim().toLowerCase(); // ✅ SINGLE SOURCE OF TRUTH

    console.log("🔍 Searching referral:", cleanRef);

    const q = query(
      collection(db, "users"),
      where("referralCode", "==", cleanRef)
    );

    const snap = await getDocs(q);

    console.log("📦 Found users:", snap.size);

    if (!snap.empty) {
      const refUser = snap.docs[0];
      console.log("✅ Referrer found:", refUser.id);
      return refUser.id;
    }

    console.log("❌ No referrer found");
    return null;
  } catch (error) {
    console.error("❌ Referral lookup error:", error);
    return null;
  }
}

// 🔥 OPTIONAL: Bonus function
export async function applyReferralBonus(
  newUserId: string,
  referrerId: string
) {
  try {
    console.log("🎁 Referral bonus placeholder", {
      newUserId,
      referrerId,
    });
  } catch (error) {
    console.error("❌ Referral bonus error:", error);
  }
}

// ✅ Generate share link
export function generateReferralLink(referralCode: string) {
  const baseLink =
    "https://play.google.com/store/apps/details?id=com.pall.network";

  return `${baseLink}&ref=${referralCode.toLowerCase()}`;
}

// ✅ Generate share message
export function generateReferralMessage(referralCode: string) {
  const link = generateReferralLink(referralCode);

  return `Join PALL NETWORK 🚀 Download App: ${link}\nUse my referral code: ${referralCode}`;
}