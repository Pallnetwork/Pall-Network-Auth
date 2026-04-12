import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export default function Admin() {
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    fetchTxns();
  }, []);

  const fetchTxns = async () => {
    const snap = await getDocs(collection(db, "transactions"));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setTxns(data);
  };

  const approve = async (id: string, userId: string, plan: string) => {
    await updateDoc(doc(db, "transactions", id), {
      status: "approved",
    });

    alert("Approved (next step we will activate user)");
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Admin Panel</h1>

      {txns.map((t: any) => (
        <div key={t.id} className="border p-3 my-2">
          <p>User: {t.userId}</p>
          <p>Plan: {t.plan}</p>
          <p>TXID: {t.txid}</p>
          <p>Status: {t.status}</p>

          <Button onClick={() => approve(t.id, t.userId, t.plan)}>
            Approve
          </Button>
        </div>
      ))}
    </div>
  );
}