import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { mineForUser } from "@/lib/mine";

/* ===============================
   ANDROID BRIDGE TYPES
=============================== */
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

  /* ===============================
     AUTH SAFETY GUARD (🔥 VERY IMPORTANT)
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
  const isAndroidApp = typeof window !== "undefined" && !!window.Android;

  /* ===============================
     FIRESTORE — SINGLE SOURCE OF TRUTH
  ================================ */
  useEffect(() => {
    const ref = doc(db, "wallets", userId);

    const unsub = onSnapshot(
      ref,
      async snap => {
        // 🟢 CREATE DOCUMENT SAFELY IF MISSING
        if (!snap.exists()) {
          await setDoc(
            ref,
            {
              pallBalance: 0,
              miningActive: false,
              lastStart: null,
              createdAt: serverTimestamp()
            },
            { merge: true }
          );
          return;
        }

        const data = snap.data();

        // 🟢 BALANCE SAFE READ
        if (typeof data.pallBalance === "number") {
          setBalance(data.pallBalance);
          if (!mining) setUiBalance(data.pallBalance);
        }

        // 🟢 MINING STATE SAFE CHECK
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
            setUiBalance(data.pallBalance ?? 0);

            await setDoc(
              ref,
              { miningActive: false },
              { merge: true }
            );
          } else {
            setMining(true);
            setCanStartMining(false);
            setLastStart(start);
            setTimeRemaining(MAX_SECONDS - elapsed);
          }
        } else {
          // 🟢 RESET SAFE
          setMining(false);
          setCanStartMining(true);
          setTimeRemaining(0);
          setLastStart(null);
        }
      },
      err => {
        console.error("🔥 Firestore snapshot error:", err);
        toast({
          title: "Firestore Error",
          description: "Permission or data issue",
          variant: "destructive"
        });
      }
    );

    return () => unsub();
  }, [userId]);

  /* ===============================
     MINING TIMER + UI BALANCE
  ================================ */
  useEffect(() => {
    if (!mining || !lastStart) return;

    let localBalance = balance;

    const uiInterval = setInterval(() => {
      setUiBalance(prev => prev + baseMiningRate);
    }, 1000);

    const cloudInterval = setInterval(async () => {
      try {
        await mineForUser();
        localBalance += baseMiningRate * 10;
        setBalance(localBalance);
      } catch (err) {
        console.error("Cloud mining failed:", err);
      }
    }, 10000);

    const countdown = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(uiInterval);
          clearInterval(cloudInterval);
          clearInterval(countdown);
          setMining(false);
          setCanStartMining(true);
          setLastStart(null);
          setUiBalance(localBalance);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(uiInterval);
      clearInterval(cloudInterval);
      clearInterval(countdown);
    };
  }, [mining, lastStart, balance, userId]);

  /* ===============================
     START MINING
  ================================ */
  const handleStartMining = async () => {
    if (mining || waitingForAd) return;

    setWaitingForAd(false);

    try {
      await mineForUser();
      toast({
        title: "Mining Started",
        description: "24h mining activated"
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Mining Error",
        description: "Could not start mining",
        variant: "destructive"
      });
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2,"0")}:${m
      .toString()
      .padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
  };

  /* ===============================
     UI
  ================================ */
  return (
    <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="pb-4">
        <h2 className="text-3xl font-bold text-center text-blue-600">Pall Mining ⛏️</h2>
      </CardHeader>

      <CardContent className="text-center space-y-6 px-6 pb-8">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Current Balance</p>
          <p className="text-3xl font-bold text-blue-600">{uiBalance.toFixed(8)} PALL</p>
        </div>

        <div className="relative w-48 h-48 mx-auto">
          <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>

          {mining && timeRemaining > 0 && (
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-blue-500"
                strokeDasharray="264"
                strokeDashoffset={264 - ((MAX_SECONDS - timeRemaining) / MAX_SECONDS) * 264}
                strokeLinecap="round"
              />
            </svg>
          )}

          <div className="absolute inset-4 bg-white dark:bg-card rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-blue-100 dark:border-blue-800">
            {mining ? (
              <>
                <div className="text-3xl mb-2">⛏️</div>
                <p className="text-base font-bold text-green-600">Mining Active</p>
                <p className="text-base font-bold text-muted-foreground">Standard Rate</p>
                <p className="text-base font-mono font-bold text-blue-600 mt-1">{formatTime(timeRemaining)}</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">💎</div>
                <p className="text-sm font-semibold text-gray-600">Ready to Mine</p>
                <p className="text-xs text-muted-foreground">Standard Mining</p>
              </>
            )}
          </div>
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