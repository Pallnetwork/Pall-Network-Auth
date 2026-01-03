// server/firebase.ts
import admin from "firebase-admin";
import fs from "fs";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH!, "utf-8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();

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
