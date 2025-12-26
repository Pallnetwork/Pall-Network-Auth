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

  const baseMiningRate = 0.00001157; // 1 PALL / 24h
  const MAX_SECONDS = 24 * 60 * 60;

  /* ===============================
     PLATFORM DETECTION
  ================================ */
  const isAndroidApp = typeof window !== "undefined" && !!window.Android;

  /* ===============================
     FETCH WALLET DATA
  ================================ */
  useEffect(() => {
    const fetchData = async () => {
      const ref = doc(db, "wallets", userId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          pallBalance: 0,
          miningActive: false,
        });
        return;
      }

      const data = snap.data();
      setBalance(data.pallBalance || 0);

      if (data.miningActive && data.lastStart) {
        const start = data.lastStart.toDate();
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);

        if (elapsed >= MAX_SECONDS) {
          const earned = MAX_SECONDS * baseMiningRate;
          const finalBalance = (data.pallBalance || 0) + earned;

          await setDoc(
            ref,
            {
              pallBalance: finalBalance,
              miningActive: false,
            },
            { merge: true }
          );

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

          setDoc(
            ref,
            {
              pallBalance: localBalance,
              miningActive: false,
            },
            { merge: true }
          );

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
     START MINING (AFTER AD)
  ================================ */
  const startMiningProcess = async () => {
    const now = new Date();
    const ref = doc(db, "wallets", userId);

    setMining(true);
    setCanStartMining(false);
    setLastStart(now);
    setTimeRemaining(MAX_SECONDS);

    await setDoc(
      ref,
      {
        miningActive: true,
        lastStart: now,
        pallBalance: balance,
      },
      { merge: true }
    );

    toast({
      title: "Mining Started ⛏️",
      description: "You're now earning PALL",
    });
  };

  /* ===============================
     CLICK HANDLER
  ================================ */
  const handleStartMining = () => {
    if (!isAndroidApp) {
      toast({
        title: "Unavailable on Browser",
        description: "Mining is only available in Android App",
        variant: "destructive",
      });
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
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  /* ===============================
     UI (UNCHANGED)
  ================================ */
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">Pall Mining ⛏️</h2>
      </CardHeader>

      <CardContent className="space-y-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-3xl font-bold">{balance.toFixed(8)} PALL</p>
        </div>

        {mining && (
          <p className="font-mono text-lg">
            ⏳ {formatTime(timeRemaining)}
          </p>
        )}

        {/* BUTTON SAME — LOGIC FIXED */}
        {isAndroidApp && (
          <Button
            disabled={mining || waitingForAd || !canStartMining}
            onClick={handleStartMining}
            className="w-full text-lg"
          >
            {waitingForAd
              ? "📺 Showing Ad..."
              : mining
              ? "Mining ⛏️"
              : "Start Mining ⛏️"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
