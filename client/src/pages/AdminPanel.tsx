import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { onSnapshot } from "firebase/firestore";

export default function AdminPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "transactions"), (snap) => {
      const list: any[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();

        console.log(data); // 👈 YE LINE ADD KARO

        if (data.status === "pending" && data.plan && data.userId) {
          list.push({
            id: docSnap.id,
            ...data,
          });
        }
      });

      setRequests(list);
    });

    return () => unsub();
  }, []);

  // =========================
  // FETCH PENDING TRANSACTIONS
  // =========================
  const fetchPendingRequests = async () => {
    try {
      const snap = await getDocs(collection(db, "transactions"));

      const list: any[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();

        if (data.status === "pending" && data.plan && data.userId) {
          list.push({
            id: docSnap.id,
            ...data,
          });
        }
      });

      setRequests(list);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // =========================
  // APPROVE REQUEST (SAFE FLOW)
  // =========================
  const approveRequest = async (
    id: string,
    userId: string,
    plan: string
  ) => {
    try {
      if (loadingId) return; // prevent double click
      setLoadingId(id);

      // ❌ prevent double processing
      const req = requests.find((r) => r.id === id);
      if (!req || req.status !== "pending") {
        alert("Already processed ❌");
        setLoadingId(null);
        return;
      }

      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("User not found ❌");
        setLoadingId(null);
        return;
      }

      const userData = userSnap.data();

      // ❌ BLOCK: same active plan
      if (userData.package === plan && userData.packageStatus === "active") {
        alert("User already has this active plan ❌");
        setLoadingId(null);
        return;
      }

      // 1️⃣ Update transaction
      await updateDoc(doc(db, "transactions", id), {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: "admin",
      });

      // 2️⃣ Update user package
      await updateDoc(userRef, {
        package: plan,
        packageStatus: "active",
        updatedAt: serverTimestamp(),
      });

      alert("User Approved & Upgraded ✅");

      fetchPendingRequests();
    } catch (err) {
      console.error(err);
      alert("Error approving request");
    } finally {
      setLoadingId(null);
    }
  };

  // =========================
  // REJECT REQUEST
  // =========================
  const rejectRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, "transactions", id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: "admin",
      });

      alert("User Rejected ❌");
      fetchPendingRequests();
    } catch (err) {
      console.error(err);
      alert("Error rejecting request");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      {requests.length === 0 ? (
        <p className="text-gray-500">No pending requests</p>
      ) : (
        requests.map((req) => (
          <Card key={req.id} className="mb-4">
            <CardContent className="p-4 flex justify-between items-center">

              {/* LEFT INFO */}
              <div>
                <p><strong>User ID:</strong> {req.userId}</p>
                <p className="text-sm">
                  <strong>Plan:</strong> {req.plan}
                </p>
                <p className="text-sm">
                  <strong>Amount:</strong> {req.amount} USDT
                </p>
                <p className="text-sm break-all">
                  <strong>TXID:</strong> {req.txid}
                </p>

                <p className="text-xs mt-1">
                  Status:
                  <span className="font-bold ml-1 text-yellow-600">
                    {req.status}
                  </span>
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-x-2">
                <Button
                  disabled={loadingId === req.id || req.status !== "pending"}
                  onClick={() =>
                    approveRequest(req.id, req.userId, req.plan)
                  }
                >
                  {loadingId === req.id ? "Processing..." : "✅ Approve"}
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => rejectRequest(req.id)}
                >
                  ❌ Reject
                </Button>
              </div>

            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}