const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.processMining = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated");
  }

  const uid = context.auth.uid;
  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();

  if (!snap.exists) return { status: "no_user" };

  const user = snap.data();
  if (!user.miningActive) return { status: "inactive" };

  const now = Date.now();
  const last = user.lastMinedAt.toMillis();

  const diffSeconds = (now - last) / 1000;
  if (diffSeconds <= 0) return { status: "no_time" };

  const earned = (diffSeconds * user.miningSpeed) / 3600;

  await userRef.update({
    pallBalance: admin.firestore.FieldValue.increment(earned),
    totalEarnings: admin.firestore.FieldValue.increment(earned),
    lastMinedAt: admin.firestore.Timestamp.now(),
  });

  return { earned };
});
