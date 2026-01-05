import { auth } from "./firebase";

export async function mineForUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  const token = await user.getIdToken(true);

  const res = await fetch("https://pall-network-auth.onrender.com/api/mine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Mine API failed:", text);
    throw new Error("Mine API failed");
  }

  return await res.json();
}