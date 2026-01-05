import { auth } from "./firebase";

/**
 * mineForUser()
 * Calls /api/mine backend with Firebase ID token.
 * Throws if user not logged in or API fails.
 */
export async function mineForUser() {
  const user = auth.currentUser;

  if (!user) {
    console.error("User not logged in!"); // debug
    throw new Error("User not logged in");
  }

  // 🔥 FORCE FRESH TOKEN
  const token = await user.getIdToken(true);
  console.log("Mining token:", token);

  // 🔹 Backend URL — use environment variable if available
  const baseUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:8082";

  try {
    const res = await fetch(`${baseUrl}/api/mine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Mine API failed:", text);
      throw new Error(text || "Mine API failed");
    }

    const data = await res.json();
    console.log("Mine API success:", data);
    return data;
  } catch (err: any) {
    console.error("Mining request failed:", err.message || err);
    throw new Error(err.message || "Mining request failed");
  }
}