import { auth } from "./firebase";

// ✅ Wait for Firebase user reliably
async function waitForAuthUser(
  maxRetries = 3,
  delay = 1500
): Promise<any> {
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
      else reject(new Error("No Firebase user found after retries"));
    });
  });
}

export async function mineForUser() {
  try {
    const user = auth.currentUser ?? (await waitForAuthUser());

    if (!user) {
      return {
        status: "error",
        message: "User not authenticated",
      };
    }

    const token = await user.getIdToken(true);

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

    const data = await res.json();

    // 🔥 FIX (ROOT CAUSE)
    // Backend 400 + "Mining already active" = VALID STATE
    if (!res.ok) {
      if (data?.error === "Mining already active") {
        return {
          status: "success",
          data: {
            alreadyActive: true,
          },
        };
      }

      return {
        status: "error",
        message: data?.error || "Mining request failed",
      };
    }

    return { status: "success", data };
  } catch (err: any) {
    return {
      status: "error",
      message: err.message || "Unexpected error",
    };
  }
}