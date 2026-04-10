import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

/**
 * ✅ Get direct referrals (F1 users list)
 */
export async function getReferralUsers(userId: string) {
  try {
    if (!userId) return [];

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

/**
 * ✅ Referral summary (F1/F2 placeholder)
 */
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

/**
 * 🔥 FIXED: Referral code lookup (MOST IMPORTANT)
 * - trim + lowercase safe
 * - handles undefined/null safely
 */
export async function handleReferralOnInstall({
  ref,
}: {
  ref: string;
}) {
  try {
    if (!ref) return null;

    const cleanRef = ref.trim().toLowerCase();

    console.log("🔍 Searching referral code:", cleanRef);

    const q = query(
      collection(db, "users"),
      where("referralCode", "==", cleanRef)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      console.log("❌ No referrer found for:", cleanRef);
      return null;
    }

    const refUser = snap.docs[0].data();
    const refUserId = snap.docs[0].id;

    console.log("✅ Referrer found:", refUserId);

    return refUserId;
  } catch (error) {
    console.error("❌ Referral lookup error:", error);
    return null;
  }
}

/**
 * 🔥 OPTIONAL: Bonus system placeholder
 */
export async function applyReferralBonus(
  newUserId: string,
  referrerId: string
) {
  try {
    if (!newUserId || !referrerId) return;

    console.log("🎁 Referral bonus placeholder", {
      newUserId,
      referrerId,
    });

    // Future logic:
    // - update wallet
    // - add commission
    // - write transaction log
  } catch (error) {
    console.error("❌ Referral bonus error:", error);
  }
}

/**
 * ✅ Generate referral link
 */
export function generateReferralLink(referralCode: string) {
  const baseLink =
    "https://play.google.com/store/apps/details?id=com.pall.network";

  const code = referralCode?.toLowerCase() || "";

  return `${baseLink}&ref=${code}`;
}

/**
 * ✅ Generate WhatsApp / Telegram message
 */
export function generateReferralMessage(referralCode: string) {
  const link = generateReferralLink(referralCode);

  return `Join PALL NETWORK 🚀 Download App: ${link}\nUse my referral code: ${referralCode}`;
}