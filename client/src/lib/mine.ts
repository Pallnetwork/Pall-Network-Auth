import { auth } from "./firebase"; // adjust path agar zaroorat ho

export async function mineForUser() {
  const user = auth.currentUser;

  if (!user) {
    console.error("User not logged in!"); // debug
    throw new Error("User not logged in");
  }

  // 🔥 FORCE FRESH TOKEN
  const token = await user.getIdToken(true);
  console.log("POSTMAN TOKEN:", token); // Postman testing ke liye

  const res = await fetch("http://localhost:8082/api/mine", {
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
