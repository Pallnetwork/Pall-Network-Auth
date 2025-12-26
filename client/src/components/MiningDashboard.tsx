// client/src/components/MiningDashboard.tsx

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

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
  const [balance, setBalance] = useState(0);
  const [mining, setMining] = useState(false);
  const [lastStart, setLastStart] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canStartMining, setCanStartMining] = useState(true);

  const { toast } = useToast();

  const baseMiningRate = 0.00001157;
  const MAX_SEC = 24 * 60 * 60;

  // -------------------------
  // Fetch wallet
  // -------------------------
  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDoc(doc(db, "wallets", userId));
      if (!snap.exists()) {
        await setDoc(doc(db, "wallets", userId), {
          pallBalance: 0,
          miningActive: false,
        });
        return;
      }

      const data = snap.data();
      setBalance(data.pallBalance || 0);

      if (data.miningActive && data.lastStart) {
        const last = data.lastStart.toDate();
        const elapsed = Math.floor((Date.now() - last.getTime()) / 1000);

        if (elapsed >= MAX_SEC) {
          setMining(false);
          setCanStartMining(true);
          setTimeRemaining(0);
        } else {
          setMining(true);
          setCanStartMining(false);
          setLastStart(last);
          setTimeRemaining(MAX_SEC - elapsed);
        }
      }
    };

    fetchData();
  }, [userId]);

  // -------------------------
  // Mining timer
  // -------------------------
  useEffect(() => {
    if (!mining || !lastStart) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setMining(false);
          setCanStartMining(true);
          return 0;
        }
        return prev - 1;
      });

      setBalance((b) => b + baseMiningRate);
    }, 1000);

    return () => clearInterval(interval);
  }, [mining, lastStart]);

  // -------------------------
  // Start mining AFTER rewarded ad
  // -------------------------
  const startMiningProcess = async () => {
    const now = new Date();

    await setDoc(
      doc(db, "wallets", userId),
      {
        miningActive: true,
        lastStart: now,
        pallBalance: balance,
      },
      { merge: true }
    );

    setMining(true);
    setCanStartMining(false);
    setLastStart(now);
    setTimeRemaining(MAX_SEC);

    toast({
      title: "Mining Started ⛏️",
      description: "You're earning PALL",
    });
  };

  // -------------------------
  // Listen rewarded ad callback (Android)
  // -------------------------
  useEffect(() => {
    const onRewarded = () => {
      startMiningProcess();
    };

    window.addEventListener("rewardedAdComplete", onRewarded);
    return () => window.removeEventListener("rewardedAdComplete", onRewarded);
  }, []);

  // -------------------------
  // Button click
  // -------------------------
  const onStartMiningClick = () => {
    if (!window.Android?.showRewardedAd) {
      toast({
        title: "Android App Required",
        description: "Mining only works inside Android app",
        variant: "destructive",
      });
      return;
    }

    window.Android.showRewardedAd();
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const progress =
    timeRemaining > 0 ? ((MAX_SEC - timeRemaining) / MAX_SEC) * 100 : 0;

  // ===============================
  // UI (UNCHANGED)
  // ===============================
  return (
    <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="pb-4">
        <h2 className="text-3xl font-bold text-center text-blue-600">
          Pall Mining ⛏️
        </h2>
      </CardHeader>

      <CardContent className="text-center space-y-6 px-6 pb-8">
        <div className="p-6 rounded-xl border shadow-sm">
          <p className="text-sm mb-2">Current Balance</p>
          <p className="text-3xl font-bold text-blue-600">
            {balance.toFixed(8)} PALL
          </p>
        </div>

        <div className="relative w-48 h-48 mx-auto">
          <div className="absolute inset-0 rounded-full border-8" />
          {mining && (
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="42"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${progress * 2.64} 264`}
              />
            </svg>
          )}

          <div className="absolute inset-4 rounded-full flex flex-col items-center justify-center">
            {mining ? (
              <>
                <div className="text-3xl">⛏️</div>
                <p className="font-bold text-green-600">Mining Active</p>
                <p className="font-mono text-blue-600">
                  {formatTime(timeRemaining)}
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl">💎</div>
                <p className="text-sm">Ready to Mine</p>
              </>
            )}
          </div>
        </div>

        <Button
          onClick={onStartMiningClick}
          disabled={mining || !canStartMining}
          className="w-full py-4 text-lg font-bold rounded-xl"
        >
          {mining ? "Mining ⛏️" : "Start Mining ⛏️"}
        </Button>
      </CardContent>
    </Card>
  );
}
