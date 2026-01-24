import { db, storage } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getDoc } from "firebase/firestore";

export async function saveUserProfile(
  uid: string,
  data: any,
  photoFile?: File
) {
  try {
    let photoURL = "";

    if (photoFile) {
      const photoRef = ref(storage, profilePhotos/${uid}.jpg);
      await uploadBytes(photoRef, photoFile);
      photoURL = await getDownloadURL(photoRef);
    }

    await setDoc(
      doc(db, "profiles", uid),
      {
        ...data,
        photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return true;
  } catch (err) {
    console.error("Profile save error:", err);
    return false;
  }
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "profiles", uid));
  return snap.exists() ? snap.data() : null;
}