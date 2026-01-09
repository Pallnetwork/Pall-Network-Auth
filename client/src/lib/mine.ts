import { auth } from "./firebase";

export async function mineForUser() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");

    const token = await user.getIdToken(true);

    console.log("Firebase ID Token:", token);

    const res = await fetch(
      "https://pall-network-auth.onrender.com/api/mine",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Mine API failed:", text);
      return { status: "error", message: text };
    }

    return await res.json();
  } catch (err) {
    console.error("mineForUser failed:", err);
    return { status: "error", message: err.message };
  }
}