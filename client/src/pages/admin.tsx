import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useLocation } from "wouter";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { onAuthStateChanged } from "firebase/auth";

const ADMIN_UID = "Kyqy8Ra4qxfJxj4WdIB4a77BH172";

export default function Admin() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [, navigate] = useLocation();

  // =========================
  // AUTH CHECK (FIXED)
  // =========================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/app/signin");
        return;
      }

      if (user.uid !== ADMIN_UID) {
        navigate("/app/signin");
        return;
      }

      setCheckingAuth(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    fetchTxns();
  }, []);

  // =========================
  // FETCH TRANSACTIONS
  // =========================
  const fetchTxns = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "transactions"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTxns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // APPROVE USER
  // =========================
  const approve = async (tx: any) => {
    try {
      const txRef = doc(db, "transactions", tx.id);

      await updateDoc(txRef, {
        status: "approved",
      });

      await addDoc(collection(db, "admin_history"), {
        transactionId: tx.id,
        userId: tx.userId,
        plan: tx.plan,
        amount: tx.amount || 0,
        txid: tx.txid,
        status: "approved",
        actionBy: "admin",
        timestamp: serverTimestamp(),
      });

      const now = new Date();
      let expiryDate = new Date();

      if (tx.plan === "starter") {
        expiryDate.setMonth(now.getMonth() + 3);
      } else if (tx.plan === "growth") {
        expiryDate.setMonth(now.getMonth() + 6);
      } else {
        expiryDate.setFullYear(now.getFullYear() + 100);
      }

      const profileRef = doc(db, "profiles", tx.userId);

      await setDoc(
        profileRef,
        {
          subscription: {
            plan: tx.plan,
            status: "active",
            expiry: expiryDate,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );

      alert("Approved Successfully 🚀");
      fetchTxns();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // REJECT USER
  // =========================
  const reject = async (tx: any) => {
    try {
      const txRef = doc(db, "transactions", tx.id);

      await updateDoc(txRef, {
        status: "rejected",
      });

      await addDoc(collection(db, "admin_history"), {
        transactionId: tx.id,
        userId: tx.userId,
        plan: tx.plan,
        amount: tx.amount || 0,
        txid: tx.txid,
        status: "rejected",
        actionBy: "admin",
        timestamp: serverTimestamp(),
      });

      alert("Rejected ❌");
      fetchTxns();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // LOADING SCREEN (IMPORTANT)
  // =========================
  if (checkingAuth) {
    return <div>Loading admin panel...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Admin Panel</h1>

      {loading && <p>Loading transactions...</p>}

      {txns.length === 0 && !loading && <p>No transactions found</p>}

      {txns.map((t: any) => (
        <div key={t.id} className="border p-3 my-2 rounded">
          <p><b>User:</b> {t.userId}</p>
          <p><b>Plan:</b> {t.plan}</p>
          <p><b>TXID:</b> {t.txid}</p>
          <p><b>Status:</b> {t.status}</p>

          <Button
            disabled={t.status === "approved"}
            onClick={() => approve(t)}
          >
            {t.status === "approved" ? "Approved ✅" : "Approve"}
          </Button>

          <Button
            variant="destructive"
            className="ml-2"
            onClick={() => reject(t)}
          >
            Reject
          </Button>
        </div>
      ))}
    </div>
  );
}