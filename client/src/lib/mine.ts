import { auth } from "./firebase";

async function waitForAuthUser(): Promise<any> {
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        unsub();
        resolve(user);
      }
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

    if (!res.ok) {
      return { status: "error", message: data?.error };
    }

    return { status: "success", data };
  } catch (err: any) {
    return { status: "error", message: err.message };
  }
}
