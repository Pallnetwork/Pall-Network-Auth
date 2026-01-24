import { db, storage } from "./firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

    let photoURL = data.photoURL || "";

    // ✅ Upload photo ONLY if real file exists
    if (photoFile instanceof File) {
      const photoRef = ref(storage, `profilePhotos/${uid}`);
      await uploadBytes(photoRef, photoFile);
      photoURL = await getDownloadURL(photoRef);
    }

    // ✅ Firestore save (merge = safe)
    await setDoc(
      doc(db, "profiles", uid),
      {
        ...data,
        photoURL,
        userId: uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return true;
  } catch (err) {
    console.error("❌ Profile save error:", err);
    return false;
  }
}

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