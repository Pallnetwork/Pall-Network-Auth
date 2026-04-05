// server/firebase.ts
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

// 🔹 ES module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Firebase service account
let serviceAccount: admin.ServiceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  const localPath = path.resolve(__dirname, "serviceAccountKey.json");
  if (!fs.existsSync(localPath)) {
    throw new Error(`serviceAccountKey.json not found at ${localPath}`);
  }
  serviceAccount = JSON.parse(fs.readFileSync(localPath, "utf-8"));
}

// ✅ Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  });
}

export const auth = admin.auth();
export const db = admin.firestore();

/* ===============================
   🔥 SECURE MongoDB Setup
=============================== */

// ✅ Get from ENV (IMPORTANT)
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error("❌ MONGO_URI missing in .env");
}

// Decide DB
const dbName =
  process.env.NODE_ENV === "production"
    ? "pall_network_prod"
    : "pall_network_dev";

// Create client
export const mongoClient = new MongoClient(mongoUri);

// Connect
export async function connectMongo() {
  try {
    await mongoClient.connect();
    console.log(`✅ Connected to MongoDB (${dbName})`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}

// Export DB
export const mongoDB = mongoClient.db(dbName);

/* ===============================
   ⛏️ Mining Logic
=============================== */

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

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