import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import {
  doc,
  updateDoc,
  serverTimestamp,
  increment,
  onSnapshot,
} from "firebase/firestore";

interface StartMiningPopupProps {
  uid: string;
  onClose: () => void;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

declare global {
  interface Window {
    AndroidBridge?: {
      startMiningRewardedAd?: () => void;
      setAdPurpose?: (purpose: string) => void;
    };
  }
}

export default function StartMiningPopup({
  uid,
  onClose,
}: StartMiningPopupProps) {
  const { toast } = useToast();

  const [miningActive, setMiningActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [waitingAd, setWaitingAd] = useState(false);
  const [multiplier, setMultiplier] = useState(0.5);
  const [balance, setBalance] = useState(0);

  // ======================
  // LIVE MINING SNAPSHOT
  // ======================
  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, "wallets", uid);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (!data) return;

      const baseBalance =
        typeof data.pallBalance === "number" ? data.pallBalance : 0;

      const isActive = data.miningActive ?? false;
      const lastStart = data.lastStart?.toDate?.() || null;
      const m =
        typeof data.miningMultiplier === "number"
          ? data.miningMultiplier
          : 0.5;

      setMiningActive(isActive);
      setMultiplier(m);

      if (isActive && lastStart) {
        const interval = setInterval(() => {
          const elapsed = Date.now() - lastStart.getTime();
          const remaining = Math.max(ONE_DAY_MS - elapsed, 0);

          setTimeRemaining(remaining);

          const progress =
            (Math.min(elapsed, ONE_DAY_MS) / ONE_DAY_MS) * m;

          setBalance(baseBalance + progress);

          if (remaining <= 0) {
            clearInterval(interval);
          }
        }, 1000);

        return () => clearInterval(interval);
      } else {
        setTimeRemaining(0);
        setBalance(baseBalance);
      }
    });

    return () => unsub();
  }, [uid]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    const styleNumber = (n: number) => (
      <span
        style={{
          fontWeight: "bold",
          textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
        }}
      >
        {n.toString().padStart(2, "0")}
      </span>
    );

    return (
      <>
        {styleNumber(h)}:{styleNumber(m)}:{styleNumber(s)}
      </>
    );
  };

  // ======================
  // Finish Mining
  // ======================
  const finishMining = async () => {
    try {
      const walletRef = doc(db, "wallets", uid);

      await updateDoc(walletRef, {
        miningActive: false,
        lastStart: null,
        pallBalance: increment(multiplier),
        totalEarnings: increment(multiplier),
        miningMultiplier: 0.5,
        lastMinedAt: serverTimestamp(),
      });

      toast({
        title: "⛏ Mining Completed",
        description: `${multiplier} PALL added to wallet`,
      });
    } catch (err: any) {
      console.error("Error finishing mining:", err);
      toast({
        title: "Error",
        description: "Failed to complete mining",
        variant: "destructive",
      });
    }
  };

  // ======================
  // Start Normal Mining
  // ======================
  const handleNormalMining = async () => {
    if (miningActive) {
      toast({
        title: "Mining already active",
        description: "Wait for 24h",
        variant: "destructive",
      });
      return;
    }

    try {
      const walletRef = doc(db, "wallets", uid);

      await updateDoc(walletRef, {
        miningActive: true,
        lastStart: new Date(),
        miningMultiplier: 0.5,
      });

      toast({
        title: "Mining Started",
        description: "Normal 24h mining started!",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to start mining",
        variant: "destructive",
      });
    }
  };

  // ======================
  // 2× Mining
  // ======================
  const handleAdMining = () => {
    if (miningActive) {
      toast({
        title: "Mining already active",
        description: "Wait for 24h",
        variant: "destructive",
      });
      return;
    }

    setWaitingAd(true);

    if (window.AndroidBridge?.startMiningRewardedAd) {
      window.AndroidBridge.setAdPurpose?.("mining");
      window.AndroidBridge.startMiningRewardedAd();

      const onAdComplete = async () => {
        window.removeEventListener("rewardAdCompleted", onAdComplete);
        await start2xMining();
      };

      window.addEventListener("rewardAdCompleted", onAdComplete);
    } else {
      // fallback for testing
      setTimeout(async () => {
        await start2xMining();
      }, 3000);
    }
  };

  const start2xMining = async () => {
    try {
      const walletRef = doc(db, "wallets", uid);

      await updateDoc(walletRef, {
        miningActive: true,
        lastStart: new Date(),
        miningMultiplier: 1,
      });

      setWaitingAd(false);

      toast({
        title: "2× Mining Started",
        description: "24h mining activated!",
      });
    } catch (err: any) {
      console.error(err);
      setWaitingAd(false);
      toast({
        title: "Error",
        description: "Failed to start 2× mining",
        variant: "destructive",
      });
    }
  };

  // ======================
  // UI
  // ======================
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <Card className="max-w-md w-full rounded-2xl shadow-lg border-0 bg-white dark:bg-gray-800 p-6">
        <CardContent className="space-y-6 text-center">
          <h2 className="text-xl font-bold text-blue-600">
            Start Mining ⛏️
          </h2>

          {/* Circle */}
          <div className="relative w-48 h-48 mx-auto">
            <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>

            {miningActive && (
              <svg
                className="absolute inset-0 w-full h-full transform -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-blue-500"
                  strokeDasharray="264"
                  strokeDashoffset={
                    264 -
                    ((ONE_DAY_MS - timeRemaining) / ONE_DAY_MS) * 264
                  }
                  strokeLinecap="round"
                />
              </svg>
            )}

            <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-blue-100 dark:border-blue-800 text-center">
              <p className="text-xl font-mono font-bold text-blue-600">
                {formatTime(timeRemaining)}
              </p>

              <p className="text-base font-semibold text-green-700 mt-1">
                {balance.toFixed(6)} PALL
              </p>

              <p
                className={`text-xs font-bold mt-1 ${
                  multiplier === 1
                    ? "text-orange-750"
                    : "text-gray-750"
                }`}
              >
                {multiplier === 1 ? "2× Mining" : "Normal Mining"}
              </p>
            </div>
          </div>

          <Button
            disabled={miningActive || waitingAd}
            onClick={handleNormalMining}
            className="w-full py-4 text-lg font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-lg"
          >
            {miningActive ? "Mining Active ⛏" : "Normal Mining ⛏"}
          </Button>

          <Button
            disabled={miningActive || waitingAd}
            onClick={handleAdMining}
            className="w-full py-4 text-lg font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-lg"
          >
            {waitingAd
              ? "📺 Showing Ad..."
              : "2× Mining 🔥 Watch Ad"}
          </Button>

          <p className="text-sm text-muted-foreground font-medium">
            Claim for normal reward
            <span className="font-bold text-blue-600"> | 2× Claim:</span> watch ad to double
          </p>

          <Button
            variant="outline"
            className="w-full py-2 mt-2"
            onClick={onClose}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
