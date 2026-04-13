import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";
import { useLocation } from "wouter";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// 🔐 Binance BEP20 Wallet Address
const RECEIVER_ADDRESS = "0x95a06defc685659068820ee58ec65fe4a75df633";

export default function UpgradePage({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [txid, setTxid] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

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
    } catch {
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
    if (!selectedPlan || !txid || !agreed) {
      toast({
        title: "Error",
        description: "Complete all fields and accept agreement",
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
        description: "Payment submitted (verification within 24h)",
      });

      // RESET
      setSelectedPlan(null);
      setTxid("");
      setAgreed(false);

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
      {/* PLANS */}
      {/* ===================== */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.popular ? "border-green-500 border-2" : ""}
          >
            <CardContent className="p-5 space-y-3">

              {plan.popular && (
                <div className="text-xs bg-green-500 text-white px-2 py-1 rounded inline-block">
                  Most Popular
                </div>
              )}

              <h2 className="text-xl font-bold">{plan.name}</h2>

              <p className="text-lg font-semibold">{plan.price} USDT</p>

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
      {/* 🔥 SINGLE POPUP */}
      {/* ===================== */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">

          <div className="bg-white p-4 rounded-xl w-[320px] shadow-xl space-y-4 relative">

            {/* CLOSE */}
            <button
              onClick={() => {
                setSelectedPlan(null);
                setTxid("");
                setAgreed(false);
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-lg font-bold"
            >
              ✕
            </button>

            {/* PLAN */}
            <h2 className="text-lg font-bold">
              {selectedPlan.name} Plan Selected
            </h2>

            {/* WARNING */}
            <div className="bg-yellow-50 p-2 rounded border text-xs">
              ⚠️ Send payment using <b>BEP20 (BSC Network)</b> only
              <br />
              Wrong network may result in permanent loss.
            </div>

            {/* AMOUNT */}
            <p className="text-sm">
              Send <b>{selectedPlan.price} USDT</b> to address below:
            </p>

            {/* WALLET */}
            <div className="flex items-center gap-2">
              <p className="break-all bg-gray-100 p-2 rounded text-xs flex-1">
                {RECEIVER_ADDRESS}
              </p>

              <Button onClick={copyToClipboard} variant="outline" size="sm">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* TXID */}
            <input
              className="border p-2 w-full rounded text-sm"
              placeholder="Enter TXID (Transaction ID)"
              value={txid}
              onChange={(e) => setTxid(e.target.value)}
            />

            {/* AGREEMENT */}
            <div className="border-t pt-3 space-y-2">

              <h3 className="text-sm font-semibold">User Agreement</h3>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={() => setAgreed(!agreed)}
                />
                <p className="text-xs">
                  I agree to Terms & Conditions and understand this platform is for digital knowledge services only.
                </p>
              </div>

              <button
                className="text-blue-600 text-xs underline"
                onClick={() => navigate("/app/policy-full")}
              >
                Read Full Policy
              </button>

            </div>

            {/* SUBMIT */}
            <Button
              className="w-full"
              disabled={loading || !txid || !agreed}
              onClick={handleSubmit}
            >
              {loading ? "Submitting..." : "Submit Payment"}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              ⏳ Payment verification may take up to 24 hours
            </p>

          </div>
        </div>
      )}

    </div>
  );
}