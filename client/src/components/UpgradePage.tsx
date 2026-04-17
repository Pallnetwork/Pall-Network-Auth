import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";
import { useLocation } from "wouter";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const RECEIVER_ADDRESS = "0x95a06defc685659068820ee58ec65fe4a75df633";

export default function UpgradePage({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [txid, setTxid] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [userActivePlan, setUserActivePlan] = useState<string | null>(null);
  const [txVerified, setTxVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const getDeviceId = () => {
    let id = localStorage.getItem("deviceId");

    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("deviceId", id);
    }

    return id;
  };

  // =========================
  // LOAD USER CURRENT PLAN
  // =========================
  useEffect(() => {
    const fetchUser = async () => {
      const snap = await getDocs(
        query(collection(db, "users"), where("id", "==", userId))
      );

      snap.forEach((d) => {
        const data = d.data();
        setUserActivePlan(data.package || "free");
      });
    };

    fetchUser();
  }, [userId]);

  // =========================
  // PLANS
  // =========================
  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: 5,
      duration: "3 Months",
      features: [
        "Optional KYC verification available",
        "Initial platform credits included",
        "Entry-level access",
        "Basic features",
        "Limited content"
      ],
    },
    {
      id: "growth",
      name: "Growth",
      price: 30,
      popular: true,
      duration: "6 Months",
      features: [
        "Optional KYC verification available",
        "Enhanced platform credits",
        "Mid-level progression",
        "Expanded access + reduced ads",
        "Advanced modules"
      ],
    },
    {
      id: "elite",
      name: "Elite",
      price: 100,
      duration: "Lifetime",
      features: [
        "Optional KYC verification available",
        "Premium platform credits",
        "Full access unlock",
        "Complete feature availability",
        "Minimal ad experience"
      ],
    },
  ];

  // PHASE 5: RATE LIMIT SYSTEM
  const checkRateLimit = async (userId: string) => {
    const ref = doc(db, "rateLimits", userId);
    const snap = await getDoc(ref);

    const now = Date.now();

    if (!snap.exists()) {
      await setDoc(ref, {
        lastRequestAt: now,
        requestCount: 1,
      });
      return false;
    }

    const data = snap.data();
    const last = data.lastRequestAt || 0;

    // ⛔ BLOCK: 30 sec cooldown
    if (now - last < 30000) {
      return true;
    }

    await updateDoc(ref, {
      lastRequestAt: now,
      requestCount: (data.requestCount || 0) + 1,
    });

    return false;
  };

  // SESSION CHECK FUNCTION
  const checkDeviceSession = async (userId: string) => {
    const deviceId = getDeviceId();

    const ref = doc(db, "userSessions", userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        activeDeviceId: deviceId,
        lastLoginAt: serverTimestamp(),
      });
      return false;
    }

    const data = snap.data();

    // ❌ BLOCK if different device
    if (data.activeDeviceId !== deviceId) {
      return true;
    }

    return false;
  };

  // ✅ ADD THIS HERE
  const planOrder: any = {
    free: 0,
    starter: 1,
    growth: 2,
    elite: 3,
  };

  // =========================
  // COPY WALLET
  // =========================
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(RECEIVER_ADDRESS);
    toast({ title: "Copied" });
  };

  // =========================
  // TXID BASIC VALIDATION
  // =========================
  const validateTxid = (value: string) => {
    if (!value) return false;

    const txRegex = /^0x([A-Fa-f0-9]{64})$/;
    return txRegex.test(value);
  };

  // =========================
  // VERIFY TXID (FAKE CHECK PREVENTION LAYER)
  // =========================
  const handleVerifyTxid = async () => {
    if (!validateTxid(txid)) {
      toast({
        title: "Invalid TXID",
        description: "Invalid format",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);

    try {
      const res = await fetch(
        `https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${txid}&apikey=${import.meta.env.VITE_BSCSCAN_API_KEY}`
      );

      const data = await res.json();

      if (data.result.status === "1") {
        setTxVerified(true);
        toast({ title: "TXID Verified ✅" });
      } else {
        setTxVerified(false);
        toast({
          title: "Invalid TXID",
          description: "Transaction not found",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Verification failed",
        variant: "destructive",
      });
    }

    setVerifying(false);
  };

  // =========================
  // DUPLICATE PLAN CHECK
  // =========================
  const checkDuplicatePlan = async () => {
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", userId),
      where("plan", "==", selectedPlan.id),
      where("status", "in", ["pending", "approved"])
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      toast({
        title: "Already Exists",
        description: "You already purchased or have a pending request",
        variant: "destructive",
      });
      return true;
    }

    return false;
  };

  // =========================
  // SUBMIT PAYMENT
  // =========================
  const handleSubmit = async () => {

    const blockedDevice = await checkDeviceSession(userId);

    if (blockedDevice) {
      toast({
        title: "Multiple Device Detected",
        description: "You are logged in on another device",
        variant: "destructive",
      });
      return;
    }

    // 🚨 PHASE 5: RATE LIMIT CHECK
    const blocked = await checkRateLimit(userId);

    if (blocked) {
      toast({
        title: "Too Many Requests",
        description: "Please wait 30 seconds before trying again",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPlan || !txid || !agreed || !txVerified) {
      toast({
        title: "Verification Required",
        description: "Please verify TXID before submitting",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // PHASE 1: DUPLICATE CHECK
      const isDuplicate = await checkDuplicatePlan();
      if (isDuplicate) {
        setLoading(false);
        return;
      }

      // ❌ BLOCK: already active plan
      if (userActivePlan && userActivePlan !== "free") {
        if (userActivePlan === selectedPlan.id) {
          toast({
            title: "Already Purchased",
            description: "You already have this plan active",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // ❌ BLOCK: downgrade or same-level plan
      if (userActivePlan) {
        const currentLevel = planOrder[userActivePlan] || 0;
        const selectedLevel = planOrder[selectedPlan.id] || 0;

        if (selectedLevel <= currentLevel) {
          toast({
            title: "Upgrade Required",
            description: "You can only upgrade to a higher plan",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // CREATE TRANSACTION
      await addDoc(collection(db, "transactions"), {
        userId,
        plan: selectedPlan.id,
        amount: selectedPlan.price,
        txid,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setSelectedPlan(null);
      setTxid("");
      setAgreed(false);
      setTxVerified(false);

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

      {/* USER STATUS */}
      <div className="text-sm text-gray-500">
        Current Plan: <b>{userActivePlan || "loading..."}</b>
      </div>

      {/* PLANS */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`rounded-2xl shadow-lg p-4 transition hover:scale-105 ${
              plan.popular ? "border-2 border-green-500" : ""
            }`}
          >
            <CardContent className="space-y-3">

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
                disabled={userActivePlan === plan.id}
                onClick={() => setSelectedPlan(plan)}
              >
                Select Plan
              </Button>

            </CardContent>
          </Card>
        )}

      </div>

      {/* POPUP */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-xl w-[90%] max-w-sm shadow-xl space-y-4 text-black dark:text-white relative">

            {/* ❌ CLOSE BUTTON */}
            <button
              onClick={() => setSelectedPlan(null)}
              className="absolute top-2 right-3 text-gray-500 hover:text-red-600 text-lg"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-center">
              {selectedPlan.name} Plan
            </h2>

            <div className="flex gap-2">
              <input
                value={txid}
                onChange={(e) => {
                  setTxid(e.target.value);
                  setTxVerified(false);
                }}
                placeholder="TXID"
                className="border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <Button
                onClick={handleVerifyTxid}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {verifying ? "..." : "Verify"}
              </Button>
            </div>

            {txVerified && (
              <p className="text-green-600 text-sm">TXID Verified ✅</p>
            )}

            <div className="flex gap-2 items-center">
              <p className="text-xs break-all flex-1 bg-gray-100 dark:bg-gray-800 p-2 rounded">{RECEIVER_ADDRESS}</p>
              <Button onClick={copyToClipboard}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <label className="text-xs text-black dark:text-gray-300">
              <input
                type="checkbox"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
              />{" "}
              I agree to Terms & Conditions
            </label>

            {/* 📜 POLICY BUTTON */}
            <button
              className="text-blue-600 text-xs underline"
              onClick={() => navigate("/app/policy-full")}
            >
              Read Full Policy
            </button>

            <Button
              disabled={!txVerified || !agreed || loading}
              onClick={handleSubmit}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Submit
            </Button>

          </div>
        </div>
      )}
    </div>
  );
}