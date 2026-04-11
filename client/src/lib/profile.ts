import { db } from "./firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

/**
 * 🔥 CLEAN PROFILE ENGINE (NO IMAGE)
 * - Only text data
 * - No Firebase Storage
 * - No CORS issues
 */
export async function saveUserProfile(
  uid: string,
  data: any
) {
  try {
    if (!uid) {
      console.error("❌ UID missing");
      return { success: false };
    }

    console.log("🔥 Saving profile (TEXT ONLY):", data);

    // ===============================
    // ✅ FINAL PROFILE OBJECT (NO PHOTO)
    // ===============================
    const profileData = {
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      dob: data.dob || "",
      gender: data.gender || "",
      phone: data.phone || "",
      address: data.address || "",
      userId: uid,
      kycStatus: "pending",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    // ===============================
    // ✅ SAVE TO FIRESTORE
    // ===============================
    await setDoc(doc(db, "profiles", uid), profileData, {
      merge: true,
    });

    console.log("✅ Profile saved successfully");

    return {
      success: true,
      data: profileData,
    };
  } catch (err) {
    console.error("❌ Profile save error:", err);
    return {
      success: false,
      error: err,
    };
  }
}

/**
 * 🔍 GET PROFILE (CLEAN FETCH)
 */
export async function getUserProfile(uid: string) {
  try {
    if (!uid) return null;

    const snap = await getDoc(doc(db, "profiles", uid));

    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("❌ Profile fetch error:", err);
    return null;
  }
}