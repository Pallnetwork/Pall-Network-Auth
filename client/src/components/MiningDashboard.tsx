// client/src/components/MiningDashboard.tsx
// 🔒 FINAL SESSION 3 — LOGIC FIX ONLY (DESIGN UNCHANGED)

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { mineForUser } from "@/lib/mine";

/* ===============================
   ANDROID BRIDGE TYPES
================================ */
declare global {
  interface Window {
    Android?: {
      showRewardedAd: () => void;
      showInterstitialAd: () => void;
    };
  }
}

interface MiningDashboardProps {
  userId: string;
}

export default function MiningDashboard({ userId }: MiningDashboardProps) {
  const { toast } = useToast();

  const [balance, setBalance] = useState(0);
  const [uiBalance, setUiBalance] = useState(0);
  const [mining, setMining] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [waitingForAd, setWaitingForAd] = useState(false);

  const MAX_SECONDS = 24 * 60 * 60;
  const baseMiningRate = 0.00001157;
  const isAndroidApp = typeof window !== "undefined" && !!window.Android;

  /* ===============================
     APP OPEN INTERSTITIAL (SAFE)
  ================================ */
  useEffect(() => {
    if (isAndroidApp) {
      setTimeout(() => {
        window.Android?.showInterstitialAd?.();
      }, 1000);
    }
  }, [isAndroidApp]);

  /* ===============================
     FIRESTORE — READ ONLY (SERVER WRITES)
  ================================ */
  useEffect(() => {
    if (!userId) return;

    const ref = doc(db, "wallets", userId);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();

      if (typeof data.pallBalance === "number") {
        setBalance(data.pallBalance);
        if (!mining) setUiBalance(data.pallBalance);
      }

      if (data.miningActive && data.lastStart) {
        const start = data.lastStart.toDate();
        const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
        const remaining = Math.max(0, MAX_SECONDS - elapsed);

        setMining(true);
        setTimeRemaining(remaining);
      } else {
        setMining(false);
        setTimeRemaining(0);
      }
    });

    return () => unsub();
  }, [userId, mining]);

  /* ===============================
     UI TIMER ONLY (NO DB WRITE)
  ================================ */
  useEffect(() => {
    if (!mining || timeRemaining <= 0) return;

    const uiTick = setInterval(() => {
      setUiBalance((b) => b + baseMiningRate);
      setTimeRemaining((t) => t - 1);
    }, 1000);

    return () => clearInterval(uiTick);
  }, [mining, timeRemaining]);

  /* ===============================
     START MINING (SESSION 3 WAY)
  ================================ */
  const startMining = async () => {
    if (waitingForAd || mining) return;
    setWaitingForAd(true);

    const begin = async () => {
      try {
        await mineForUser(); // ✅ ONLY API CALL
      } catch {
        toast({
          title: "Mining failed",
          description: "Failed to fetch",
          variant: "destructive",
        });
      } finally {
        setWaitingForAd(false);
      }
    };

    if (isAndroidApp && window.Android?.showRewardedAd) {
      window.Android.showRewardedAd();

      const handler = () => {
        window.removeEventListener("rewardedAdComplete", handler);
        begin();
      };

      window.addEventListener("rewardedAdComplete", handler);

      // fallback safety
      setTimeout(() => {
        if (waitingForAd) begin();
      }, 5000);
    } else {
      begin();
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
     UI — ❌ NO CHANGE
  ================================ */
  return (
    <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="pb-4">
        <h2 className="text-3xl font-bold text-center text-blue-600">
          Pall Mining ⛏️
        </h2>
      </CardHeader>

      <CardContent className="text-center space-y-6 px-6 pb-8">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Current Balance
          </p>
          <p className="text-3xl font-bold text-blue-600">
            {uiBalance.toFixed(8)} PALL
          </p>
        </div>

        <div className="relative w-48 h-48 mx-auto">
          <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>

          {mining && timeRemaining > 0 && (
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
                  264 - ((MAX_SECONDS - timeRemaining) / MAX_SECONDS) * 264
                }
                strokeLinecap="round"
              />
            </svg>
          )}

          <div className="absolute inset-4 bg-white dark:bg-card rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-blue-100 dark:border-blue-800">
            {mining ? (
              <>
                <div className="text-3xl mb-2">⛏️</div>
                <p className="text-base font-bold text-green-600">
                  Mining Active
                </p>
                <p className="text-base font-bold text-muted-foreground">
                  Standard Rate
                </p>
                <p className="text-base font-mono font-bold text-blue-600 mt-1">
                  {formatTime(timeRemaining)}
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">💎</div>
                <p className="text-sm font-semibold text-gray-600">
                  Ready to Mine
                </p>
                <p className="text-xs text-muted-foreground">
                  Standard Mining
                </p>
              </>
            )}
          </div>
        </div>

        <Button
          disabled={mining || waitingForAd}
          onClick={startMining}
          className="w-full py-4 text-lg font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-lg"
        >
          {waitingForAd
            ? "📺 Showing Ad..."
            : mining
            ? `Mining ⛏ (${formatTime(timeRemaining)})`
            : "Start Mining ⛏"}
        </Button>
      </CardContent>
    </Card>
  );
}