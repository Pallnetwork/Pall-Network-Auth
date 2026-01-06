// client/src/lib/mine.ts
export async function startMining(token: string) {
  const res = await fetch("/api/mine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Mining failed");
  }

  return res.json();
}