import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  username: string;
  package?: string;
}

interface Profile {
  userId: string;
  subscription?: {
    status: "active" | "pending" | "inactive";
  };
}

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    const usersSnap = await getDocs(collection(db, "users"));
    const profilesSnap = await getDocs(collection(db, "profiles"));

    const profilesMap: any = {};

    profilesSnap.forEach((doc) => {
      profilesMap[doc.id] = doc.data();
    });

    const pendingUsers: any[] = [];

    usersSnap.forEach((docSnap) => {
      const user = docSnap.data();
      const profile = profilesMap[docSnap.id];

      if (profile?.subscription?.status === "pending") {
        pendingUsers.push({
          id: docSnap.id,
          ...user,
        });
      }
    });

    setUsers(pendingUsers);
  };

  const approveUser = async (userId: string) => {
    await updateDoc(doc(db, "profiles", userId), {
      "subscription.status": "active",
    });

    alert("User Approved ✅");
    fetchPendingUsers();
  };

  const rejectUser = async (userId: string) => {
    await updateDoc(doc(db, "profiles", userId), {
      "subscription.status": "inactive",
    });

    alert("User Rejected ❌");
    fetchPendingUsers();
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      {users.length === 0 ? (
        <p>No pending users</p>
      ) : (
        users.map((user) => (
          <Card key={user.id} className="mb-4">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p><strong>@{user.username}</strong></p>
                <p className="text-sm">{user.email}</p>
                <p className="text-sm">Plan: {user.package || "N/A"}</p>
              </div>

              <div className="space-x-2">
                <Button onClick={() => approveUser(user.id)}>
                  ✅ Approve
                </Button>
                <Button variant="destructive" onClick={() => rejectUser(user.id)}>
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