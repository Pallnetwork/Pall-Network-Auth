import { db, storage } from "./firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

/**
 * 🔥 FULL PROFILE ENGINE (KYC READY)
 * - Upload image to Firebase Storage
 * - Save profile to Firestore
 * - Return final saved data
 */
export async function saveUserProfile(
  uid: string,
  data: any,
  photoFile?: File | null
) {
  try {
    if (!uid) {
      console.error("❌ UID missing");
      return false;
    }

    let photoURL = "";

    // ===============================
    // 1️⃣ IMAGE UPLOAD (IF EXISTS)
    // ===============================
    if (photoFile) {
      const imageRef = ref(
        storage,
        `profiles/${uid}/profile.jpg`
      );

      await uploadBytes(imageRef, photoFile);

      photoURL = await getDownloadURL(imageRef);
    }

    // ===============================
    // 2️⃣ FINAL PROFILE OBJECT
    // ===============================
    const profileData = {
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      dob: data.dob || "",
      gender: data.gender || "",
      phone: data.phone || "",
      address: data.address || "",
      photoURL: photoURL || data.photoURL || "",
      userId: uid,
      kycStatus: "pending", // future KYC ready
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    // ===============================
    // 3️⃣ SAVE TO FIRESTORE
    // ===============================
    await setDoc(doc(db, "profiles", uid), profileData, {
      merge: true,
    });

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