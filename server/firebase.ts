// server/firebase.ts
import admin from "firebase-admin";

// ✅ Use environment variable for Firebase service account (Render safe)
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT as string
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// ✅ Firestore reference
export const db = admin.firestore();

// ✅ Firebase Auth reference
export const auth = admin.auth();

/* ===============================
   🔥 Cloud Function: mineToken
=============================== */
export async function mineToken(userId: string, rate = 0.0001157 * 10) {
  const ref = db.collection("wallets").doc(userId);

  await ref.set(
    {
      pallBalance: admin.firestore.FieldValue.increment(rate),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
