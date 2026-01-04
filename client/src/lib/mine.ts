import { auth } from "./firebase"; // ✅ same path rakho

export async function mineForUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not logged in");
  }

  // 🔥 FORCE FRESH TOKEN (MOST IMPORTANT)
  const token = await user.getIdToken(true);

  // 🔥 POSTMAN TOKEN (FOR TESTING ONLY)
  console.log("🔥 POSTMAN TOKEN START 🔥");
  console.log(token);
  console.log("🔥 POSTMAN TOKEN END 🔥");

  const res = await fetch("http://localhost:8082/api/mine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  return await res.json();
}
