// server/firebase.ts
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 🔹 ES module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Determine service account
let serviceAccount: admin.ServiceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  const localPath = path.resolve(__dirname, "serviceAccountKey.json");
  if (!fs.existsSync(localPath)) {
    throw new Error(
      `Local Firebase serviceAccountKey.json not found at ${localPath}`
    );
  }
  serviceAccount = JSON.parse(fs.readFileSync(localPath, "utf-8"));
}

// ✅ Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

// ✅ Export Auth & Firestore
export const auth = admin.auth();
export const db = admin.firestore();

/* ===============================
   ⛏️ SESSION 3 — SECURE MINING
=============================== */

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * 🔹 Secure mining token increment
 * @param uid - Firebase UID
 */
export async function mineTokenSecure(uid: string) {
  const ref = db.collection("wallets").doc(uid);
  const snap = await ref.get();
  const now = Date.now();

  if (snap.exists) {
    const data = snap.data();
    if (data?.cooldownUntil && data.cooldownUntil.toMillis() > now) {
      throw new Error("Cooldown active");
    }
  }

  await ref.set(
    {
      pallBalance: admin.firestore.FieldValue.increment(1),
      lastMinedAt: admin.firestore.Timestamp.now(),
      cooldownUntil: admin.firestore.Timestamp.fromMillis(now + COOLDOWN_MS),
    },
    { merge: true }
  );

  return { success: true };
}

export default admin;