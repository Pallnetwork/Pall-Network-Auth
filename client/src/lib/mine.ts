// client/src/lib/mine.ts
import { auth } from "./firebase";

export async function mineForUser() {
  try {
    const user = auth.currentUser;

    if (!user) {
      return {
        status: "error",
        message: "User not logged in",
      };
    }

    // 🔥 ALWAYS FETCH FRESH TOKEN
    const token = await user.getIdToken(true);

    console.log("🔥 USER UID:", user?.uid);
    console.log("🔥 TOKEN EXISTS:", !!token);
    console.log("🔥 TOKEN LENGTH:", token?.length);

    const res = await fetch(
      "https://pall-network-auth.onrender.com/api/mine",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return {
        status: "error",
        message: data?.error || "Mining failed",
      };
    }

    return {
      status: "success",
      data,
    };
  } catch (err: any) {
    console.error("mineForUser error:", err);
    return {
      status: "error",
      message: err.message || "Unknown error",
    };
  }
}