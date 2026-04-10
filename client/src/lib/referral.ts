import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

/**
 * ✅ Get direct referrals (F1 users list)
 * Source of truth: users.referredBy
 */
export async function getReferralUsers(userId: string) {
  try {
    if (!userId) return [];

    const q = query(
      collection(db, "users"),
      where("referredBy", "==", userId)
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (error) {
    console.error("❌ getReferralUsers error:", error);
    return [];
  }
}

/**
 * ✅ Referral summary (Phase 1 FIXED)
 * - Now uses real Firestore data
 */
export async function getReferralData(userId: string) {
  try {
    if (!userId) return null;

    const users = await getReferralUsers(userId);

    // 🔥 Direct referral count from DB field (FAST + SCALABLE)
    const userSnap = await getDoc(doc(db, "users", userId));
    const userData = userSnap.exists() ? userSnap.data() : null;

    return {
      f1Commission: 0,
      f2Commission: 0,
      totalCommission: 0,

      referredUsers: users,

      // 🔥 Phase 1 source of truth
      totalReferrals: userData?.referralCount || users.length,
    };
  } catch (error) {
    console.error("❌ getReferralData error:", error);
    return null;
  }
}

/**
 * 🔥 Referral code lookup (FIXED for production safety)
 * - NO lowercase mismatch issues
 * - NO split logic
 * - exact match only
 */
export async function handleReferralOnInstall({
  ref,
}: {
  ref: string;
}) {
  try {
    if (!ref) return null;

    const cleanRef = ref.trim();

    console.log("🔍 Referral lookup:", cleanRef);

    const q = query(
      collection(db, "users"),
      where("referralCode", "==", cleanRef)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      console.log("❌ No referral found");
      return null;
    }

    const refUserId = snap.docs[0].id;

    console.log("✅ Referral matched:", refUserId);

    return refUserId;
  } catch (error) {
    console.error("❌ handleReferralOnInstall error:", error);
    return null;
  }
}

/**
 * 🔥 OPTIONAL (kept for future upgrades)
 */
export async function applyReferralBonus(
  newUserId: string,
  referrerId: string
) {
  try {
    if (!newUserId || !referrerId) return;

    console.log("🎁 Bonus placeholder:", {
      newUserId,
      referrerId,
    });

    // Future:
    // - wallet credit
    // - commission logs
  } catch (error) {
    console.error("❌ applyReferralBonus error:", error);
  }
}

/**
 * ✅ Generate referral link
 */
export function generateReferralLink(referralCode: string) {
  const baseLink =
    "https://play.google.com/store/apps/details?id=com.pall.network";

  if (!referralCode) return baseLink;

  return `${baseLink}&ref=${referralCode}`;
}

/**
 * ✅ Generate share message
 */
export function generateReferralMessage(referralCode: string) {
  const link = generateReferralLink(referralCode);

  return `Join PALL NETWORK 🚀 Download App: ${link}\nReferral Code: ${referralCode}`;
}