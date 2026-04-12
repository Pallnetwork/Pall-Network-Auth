import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const RECEIVER_ADDRESS = "0xAaE232DeFc1a7951C6b8a00EC46C6d451f605cCF";

export default function UpgradePage({ userId }: { userId: string }) {
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [txid, setTxid] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // PLANS DATA
  // =========================
  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: 5,
      duration: "3 Months",
      features: ["Basic Access", "Quiz System", "Limited Content"],
    },
    {
      id: "growth",
      name: "Growth",
      price: 30,
      duration: "6 Months",
      features: ["Advanced Modules", "Full Content", "Reduced Ads"],
      popular: true,
    },
    {
      id: "elite",
      name: "Elite",
      price: 100,
      duration: "Lifetime",
      features: ["All Access", "Premium Features", "Early Updates"],
    },
  ];

  // =========================
  // COPY WALLET
  // =========================
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(RECEIVER_ADDRESS);
      toast({
        title: "Copied!",
        description: "Wallet address copied successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  // =========================
  // SUBMIT PAYMENT
  // =========================
  const handleSubmit = async () => {
    if (!selectedPlan || !txid) {
      toast({
        title: "Error",
        description: "Select plan and enter TXID",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "transactions"), {
        userId,
        plan: selectedPlan.id,
        amount: selectedPlan.price,
        txid: txid,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Success",
        description: "Payment submitted for verification (up to 24h)",
      });

      setSelectedPlan(null);
      setTxid("");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ===================== */}
      {/* PLANS CARDS */}
      {/* ===================== */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.popular ? "border-green-500 border-2" : ""}
          >
            <CardContent className="p-5 space-y-3">
              <h2 className="text-xl font-bold">{plan.name}</h2>

              <p className="text-lg font-semibold">${plan.price}</p>

              <p className="text-sm text-gray-500">{plan.duration}</p>

              <ul className="text-sm space-y-1">
                {plan.features.map((f, i) => (
                  <li key={i}>✔ {f}</li>
                ))}
              </ul>

              <Button
                className="w-full mt-2"
                onClick={() => setSelectedPlan(plan)}
              >
                Select Plan
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===================== */}
      {/* PAYMENT SECTION */}
      {/* ===================== */}
      {selectedPlan && (
        <Card>
          <CardContent className="p-5 space-y-4">

            <h2 className="text-xl font-bold">
              {selectedPlan.name} Plan Selected
            </h2>

            <p>
              Send <b>${selectedPlan.price}</b> to wallet below:
            </p>

            <div className="flex items-center gap-2">
              <p className="break-all bg-gray-100 p-2 rounded text-sm flex-1">
                {RECEIVER_ADDRESS}
              </p>

              <Button onClick={copyToClipboard} variant="outline">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <input
              className="border p-2 w-full rounded"
              placeholder="Enter TXID (Transaction ID)"
              value={txid}
              onChange={(e) => setTxid(e.target.value)}
            />

            <Button
              className="w-full"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? "Submitting..." : "Submit Payment"}
            </Button>

          </CardContent>
        </Card>
      )}

    </div>
  );
}