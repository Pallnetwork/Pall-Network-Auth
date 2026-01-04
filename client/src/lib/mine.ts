import { auth } from "./firebase"; // path adjust agar firebase.ts kahin aur ho

export async function mineForUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not logged in");
  }

  // 🔥 FORCE FRESH TOKEN (MOST IMPORTANT)
  const token = await user.getIdToken(true);

  const res = await fetch("http://localhost:8082/api/mine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return await res.json();
}
