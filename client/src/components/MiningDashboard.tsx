import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

/* ===============================
   ANDROID BRIDGE TYPES
=============================== */
declare global {
  interface Window {
    AndroidBridge?: {
      startRewardedAd: () => void;
    };
    onAdCompleted?: () => void;
    onAdFailed?: () => void;
  }
}

interface MiningDashboardProps {
  userId: string;
}

export default function MiningDashboard({ userId }: MiningDashboardProps) {
  const { toast } = useToast();

  /* ===============================
     AUTH SAFETY GUARD
  ================================ */
  if (!userId) {
    return (
      <div className="text-center mt-20 text-lg text-red-500">
        User not authenticated
      </div>
    );
  }

  const [balance, setBalance] = useState(0);
  const [uiBalance, setUiBalance] = useState(0);
  const [mining, setMining] = useState(false);
  const [lastStart, setLastStart] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canStartMining, setCanStartMining] = useState(true);
  const [waitingForAd, setWaitingForAd] = useState(false);

  const baseMiningRate = 0.00001157;
  const MAX_SECONDS = 24 * 60 * 60;

  /* ===============================
     FIRESTORE — READ ONLY
  ================================ */
  useEffect(() => {
    const ref = doc(db, "wallets", userId);

    const unsub = onSnapshot(
      ref,
      snap => {
        if (!snap.exists()) {
          setMining(false);
          setCanStartMining(true);
          setTimeRemaining(0);
          setLastStart(null);
          setBalance(0);
          setUiBalance(0);
          return;
        }

        const data = snap.data();

        if (typeof data.pallBalance === "number") {
          setBalance(data.pallBalance);
          if (!mining) setUiBalance(data.pallBalance);
        }

        if (
          data.miningActive === true &&
          data.lastStart &&
          typeof data.lastStart.toDate === "function"
        ) {
          const start = data.lastStart.toDate();
          const elapsed = Math.floor(
            (Date.now() - start.getTime()) / 1000
          );

          if (elapsed >= MAX_SECONDS) {
            setMining(false);
            setCanStartMining(true);
            setTimeRemaining(0);
            setLastStart(null);
          } else {
            setMining(true);
            setCanStartMining(false);
            setLastStart(start);
            setTimeRemaining(MAX_SECONDS - elapsed);
          }
        } else {
          setMining(false);
          setCanStartMining(true);
          setTimeRemaining(0);
          setLastStart(null);
        }
      },
      err => console.error("Firestore error:", err)
    );

    return () => unsub();
  }, [userId, mining]);

  /* ===============================
     UI TIMER (LOCAL ONLY)
  ================================ */
  useEffect(() => {
    if (!mining || !lastStart) return;

    const uiInterval = setInterval(() => {
      setUiBalance(prev => prev + baseMiningRate);
    }, 1000);

    const countdown = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(uiInterval);
          clearInterval(countdown);
          setMining(false);
          setCanStartMining(true);
          setLastStart(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(uiInterval);
      clearInterval(countdown);
    };
  }, [mining, lastStart]);

  /* ===============================
     ANDROID REWARDED AD INTEGRATION
  ================================ */
  useEffect(() => {
    window.onAdCompleted = () => {
      console.log("✅ Ad Completed - Starting Mining");
      startMiningBackend();
    };

    window.onAdFailed = () => {
      setWaitingForAd(false);
      toast({
        title: "Ad Failed",
        description: "Rewarded ad could not load",
        variant: "destructive"
      });
    };
  }, []);

  /* ===============================
     START MINING (TRIGGER AFTER AD)
  ================================ */
  const startMiningBackend = async () => {
    setWaitingForAd(false);
    try {
      const res = await fetch("http://localhost:8080/api/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (!res.ok) throw new Error("Mining failed");

      toast({ title: "Mining Started", description: "24h mining activated" });
    } catch (err) {
      console.error(err);
      toast({
        title: "Mining Error",
        description: "Could not start mining",
        variant: "destructive"
      });
    }
  };

  /* ===============================
     HANDLE START MINING BUTTON CLICK
     - Show rewarded ad first
     - On complete → start mining
  ================================ */
  const handleStartMining = () => {
    if (mining || waitingForAd || !canStartMining) return;

    if (window.AndroidBridge && window.AndroidBridge.startRewardedAd) {
      setWaitingForAd(true);
      window.AndroidBridge.startRewardedAd();
    } else {
      toast({
        title: "Mining Unavailable",
        description: "Rewarded ad bridge not detected",
        variant: "destructive"
      });
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  /* ===============================
     UI
  ================================ */
  return (
    <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="pb-4">
        <h2 className="text-3xl font-bold text-center text-blue-600">
          Pall Mining ⛏️
        </h2>
      </CardHeader>

      <CardContent className="text-center space-y-6 px-6 pb-8">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Current Balance
          </p>
          <p className="text-3xl font-bold text-blue-600">
            {uiBalance.toFixed(8)} PALL
          </p>
        </div>

        <Button
          disabled={mining || waitingForAd || !canStartMining}
          onClick={handleStartMining}
          className="w-full py-4 text-lg font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-lg"
        >
          {waitingForAd ? "📺 Showing Ad..." : mining ? `Mining ⛏ (${formatTime(timeRemaining)})` : "Start Mining ⛏"}
        </Button>
      </CardContent>
    </Card>
  );
}