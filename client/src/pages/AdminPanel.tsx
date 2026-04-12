import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminPanel() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // 🔥 STEP 1: FETCH TRANSACTIONS (ONLY PENDING)
  const fetchPendingRequests = async () => {
    try {
      const snap = await getDocs(collection(db, "transactions"));

      const list: any[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();

        // only valid plan requests
        if (data.status === "pending" && data.plan) {
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

  // 🔥 STEP 2: APPROVE REQUEST
  const approveRequest = async (
    id: string,
    userId: string,
    plan: string
  ) => {
    try {
      // 1. update transaction status
      await updateDoc(doc(db, "transactions", id), {
        status: "approved",
      });

      // 2. update user package
      await updateDoc(doc(db, "users", userId), {
        package: plan,
        packageStatus: "active",
      });

      alert("User Approved ✅");
      fetchPendingRequests();
    } catch (err) {
      console.error(err);
      alert("Error approving request");
    }
  };

  // 🔥 STEP 3: REJECT REQUEST
  const rejectRequest = async (id: string) => {
    try {
      await updateDoc(doc(db, "transactions", id), {
        status: "rejected",
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
                  <strong>Amount:</strong> ${req.amount}
                </p>
                <p className="text-sm">
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
                  onClick={() =>
                    approveRequest(req.id, req.userId, req.plan)
                  }
                >
                  ✅ Approve
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