// lib/mine.ts
import { auth } from "./firebase";

// 🔹 Wait for Firebase user reliably (Web + Android WebView safe)
async function waitForAuthUser(maxRetries = 5, delay = 1500): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const user = auth.currentUser;
    if (user) return user;

    await new Promise((res) => setTimeout(res, delay));
  }

  // fallback to onAuthStateChanged once more
  return new Promise((resolve, reject) => {
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      if (user) resolve(user);
      else reject(new Error("No Firebase user found"));
    });
  });
}

// ===============================
// 🚀 START MINING (NEW SYSTEM)
// ===============================
export async function mineForUser() {
  try {
    const user = auth.currentUser ?? (await waitForAuthUser());

    if (!user) {
      console.warn("⚠️ User not authenticated");
      return {
        status: "error", message: "User not authenticated",
      };
    }

    // 🔹 Always get correct token (WebView + Android safe)
    const token =    
      await user.getIdToken(true);

    console.log("🔥 Firebase UID:", user.uid);
    console.log("🔥 Firebase Token:", token);

    // ✅ ONLY call new backend (Firestore based)
    const res = await fetch("/api/mining/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: user.uid
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn("❌ Mining start failed:", data?.error);
      return { status: "error", message: data?.error };
    }

    console.log("✅ Mining started:", data);
    return { status: "success", data };
  } catch (err: any) {
    console.error("🔥 Mining API error:", err);
    return { status: "error", message: err.message };
  }
}