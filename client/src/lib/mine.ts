import { auth } from "./firebase";

export async function mineForUser() {
  const user = auth.currentUser;

  if (!user) {
    console.error("❌ No logged-in user");
    throw new Error("User not logged in");
  }

  // 🔥 FORCE FRESH TOKEN
  const token = await user.getIdToken(true);

  console.log("🔥 POSTMAN TOKEN:", token); // 👈 NOW IT WILL PRINT

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
    console.error("❌ Mining API failed:", text);
    throw new Error(text);
  }

  return await res.json();
}
