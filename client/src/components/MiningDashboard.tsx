// client/src/components/MiningDashboard.tsx
import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

/* ===============================
   ANDROID BRIDGE TYPES
================================ */
declare global {
  interface Window {
    Android?: {
      showRewardedAd: () => void;
    };
  }
}

interface MiningDashboardProps {
  userId: string;
}

export default function MiningDashboard({ userId }: MiningDashboardProps) {
  const { toast } = useToast();

  const [balance, setBalance] = useState(0);
  const [mining, setMining] = useState(false);
  const [lastStart, setLastStart] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canStartMining, setCanStartMining] = useState(true);
  const [waitingForAd, setWaitingForAd] = useState(false);

  const baseMiningRate = 0.00001157;
  const MAX_SECONDS = 24 * 60 * 60;

  const isAndroidApp = typeof window !== "undefined" && !!window.Android;

  /* ===============================
     APP OPEN AD AUTOMATICALLY
  ================================ */
  useEffect(() => {
    if (isAndroidApp) {
      setTimeout(() => {
        window.Android?.showRewardedAd();
      }, 1000); // 1 sec delay for app initialization
    }
  }, [isAndroidApp]);

  /* ===============================
     FETCH WALLET DATA
  ================================ */
  useEffect(() => {
    const fetchData = async () => {
      const ref = doc(db, "wallets", userId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, { pallBalance: 0, miningActive: false });
        return;
      }

      const data = snap.data();
      setBalance(data.pallBalance || 0);

      if (data.miningActive && data.lastStart) {
        const start = data.lastStart.toDate();
        const elapsed = Math.floor((new Date().getTime() - start.getTime()) / 1000);

        if (elapsed >= MAX_SECONDS) {
          const finalBalance = (data.pallBalance || 0) + MAX_SECONDS * baseMiningRate;
          await setDoc(ref, { pallBalance: finalBalance, miningActive: false }, { merge: true });
          setBalance(finalBalance);
          setMining(false);
          setCanStartMining(true);
          setTimeRemaining(0);
        } else {
          setMining(true);
          setCanStartMining(false);
          setLastStart(start);
          setTimeRemaining(MAX_SECONDS - elapsed);
        }
      }
    };

    fetchData();
  }, [userId]);

  /* ===============================
     MINING TIMER
  ================================ */
  useEffect(() => {
    if (!mining || !lastStart) return;

    const ref = doc(db, "wallets", userId);
    let localBalance = balance;

    const balanceTimer = setInterval(() => {
      localBalance += baseMiningRate;
      setBalance(localBalance);
    }, 1000);

    const saveTimer = setInterval(() => {
      setDoc(ref, { pallBalance: localBalance }, { merge: true });
    }, 10000);

    const countdown = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(balanceTimer);
          clearInterval(saveTimer);
          clearInterval(countdown);
          setMining(false);
          setCanStartMining(true);
          setLastStart(null);
          setDoc(ref, { pallBalance: localBalance, miningActive: false }, { merge: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(balanceTimer);
      clearInterval(saveTimer);
      clearInterval(countdown);
    };
  }, [mining, lastStart]);

  /* ===============================
     START MINING AFTER AD
  ================================ */
  const startMiningProcess = async () => {
    const now = new Date();
    const ref = doc(db, "wallets", userId);

    setMining(true);
    setCanStartMining(false);
    setLastStart(now);
    setTimeRemaining(MAX_SECONDS);

    await setDoc(ref, { miningActive: true, lastStart: now, pallBalance: balance }, { merge: true });

    toast({ title: "Mining Started ⛏️", description: "You're now earning PALL" });
  };

  /* ===============================
     START MINING BUTTON CLICK
  ================================ */
  const handleStartMining = () => {
    if (!isAndroidApp) {
      toast({ title: "Unavailable on Browser", description: "Mining is only available in Android App", variant: "destructive" });
      return;
    }

    if (waitingForAd) return;

    setWaitingForAd(true);
    window.Android?.showRewardedAd();
  };

  /* ===============================
     LISTEN AD COMPLETE EVENT
  ================================ */
  useEffect(() => {
    const onAdComplete = () => {
      setWaitingForAd(false);
      startMiningProcess();
    };

    window.addEventListener("rewardedAdComplete", onAdComplete);
    return () => window.removeEventListener("rewardedAdComplete", onAdComplete);
  }, []);

  /* ===============================
     HELPERS
  ================================ */
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
  };

  /* ===============================
     UI (OLD DESIGN PRESERVED)
  ================================ */
  return (
    <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="pb-4">
        <h2 className="text-3xl font-bold text-center text-blue-600">Pall Mining ⛏️</h2>
      </CardHeader>
      <CardContent className="text-center space-y-6 px-6 pb-8">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Current Balance</p>
          <p className="text-3xl font-bold text-blue-600">{balance.toFixed(8)} PALL</p>
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
                strokeDasharray={`${((MAX_SECONDS - timeRemaining)/MAX_SECONDS)*264} 264`}
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
