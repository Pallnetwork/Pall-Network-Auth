// server/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, increment } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/* ===============================
   🔥 Cloud Function: mineToken
=============================== */
export async function mineToken(userId: string, rate = 0.0001157 * 10) {
  try {
    const ref = doc(db, "wallets", userId);
    await updateDoc(ref, { pallBalance: increment(rate) });
  } catch (err) {
    console.error("mineToken failed:", err);
  }
}
