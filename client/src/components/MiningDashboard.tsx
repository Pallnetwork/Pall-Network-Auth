// client/src/components/MiningDashboard.tsx
import React, { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { mineForUser } from "@/lib/mine";
import { claimDailyReward } from "@/lib/dailyReward";

declare global {
  interface Window {
    AndroidBridge?: {
      startRewardedAd: () => void;
      startDailyRewardedAd?: () => void;
      setAdPurpose?: (purpose: string) => void;
    };
    onAdCompleted?: () => void;
    onAdFailed?: () => void;
    onRewardAdCompleted?: () => void;
  }
}

export default function MiningDashboard() {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid || null);
  const [balance, setBalance] = useState(0);
  const [uiBalance, setUiBalance] = useState(0);
  const [mining, setMining] = useState(false);
  const [lastStart, setLastStart] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canStartMining, setCanStartMining] = useState(true);
  const [waitingForAd, setWaitingForAd] = useState(false);

  // Daily Reward States
  const [claimedCount, setClaimedCount] = useState(0);
  const [dailyWaiting, setDailyWaiting] = useState(false);

  const toast = useToast();
  const baseMiningRate = 0.00001157;
  const MAX_SECONDS = 24 * 60 * 60;

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUid(user.uid);
      else setUid(null);
    });
    return () => unsubscribe();
  }, []);

  // Firestore listener for wallet and mining status
  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, "wallets", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          if (!waitingForAd) {
            setMining(false);
            setCanStartMining(true);
            setTimeRemaining(0);
            setLastStart(null);
            setBalance(0);
            setUiBalance(0);
          }
          return;
        }

        const data = snap.data();

        if (typeof data.pallBalance === "number") {
          setBalance(data.pallBalance);
          if (!mining) setUiBalance(data.pallBalance);
        }

        if (data.miningActive && data.lastStart?.toDate) {
          const start = data.lastStart.toDate();
          const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);

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
      (err) => console.error("Firestore error:", err)
    );

    return () => unsub();
  }, [uid, waitingForAd]);

  // UI timer for mining balance and countdown
  useEffect(() => {
    if (!mining || !lastStart) return;

    const uiInterval = setInterval(() => {
      setUiBalance((prev) => prev + baseMiningRate);
    }, 1000);

    const countdown = setInterval(() => {
      setTimeRemaining((prev) => {
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

  // Android Rewarded Ad Callbacks
  useEffect(() => {
    window.onAdCompleted = async () => {
      setWaitingForAd(false);
      try {
        const result = await mineForUser();
        if (result.status === "error") {
          toast({
            title: "Mining Error",
            description: result.message || "Could not start mining",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Mining Started",
          description: "24h mining activated",
        });
      } catch (err) {
        console.error(err);
        toast({
          title: "Mining Error",
          description: "Unexpected error occurred",
          variant: "destructive",
        });
      }
    };

    window.onAdFailed = () => {
      setWaitingForAd(false);
      toast({
        title: "Ad Failed",
        description: "Rewarded ad could not load",
        variant: "destructive",
      });
    };

    window.onRewardAdCompleted = async () => {
      if (!uid) {
        setDailyWaiting(false);
        return;
      }

      try {
        const res = await claimDailyReward(uid);
        if (res.status === "success") {
          setClaimedCount(res.data.newCount);
          setUiBalance((prev) => prev + 0.1);
          setDailyWaiting(false);

          toast({
            title: "🎉 Reward Received",
            description: "+0.1 Pall added to your balance",
          });
        } else {
          setDailyWaiting(false);
          toast({
            title: "Error",
            description: res.message || "Reward claim failed",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error(err);
        setDailyWaiting(false);
        toast({
          title: "Error",
          description: "Unexpected error during daily reward",
          variant: "destructive",
        });
      }
    };

    return () => {
      window.onAdCompleted = undefined;
      window.onAdFailed = undefined;
      window.onRewardAdCompleted = undefined;
    };
  }, [uid]);

  const handleStartMining = () => {
    if (waitingForAd) return;

    if (window.AndroidBridge?.startMiningRewardedAd) {
      setWaitingForAd(true);
      try {
        window.AndroidBridge.setAdPurpose?.("mining");
        window.AndroidBridge.startMiningRewardedAd();
      } catch {
        setWaitingForAd(false);
        toast({
          title: "Ad Error",
          description: "Could not start rewarded ad",
          variant: "destructive",
        });
      }
    } else {
      startMiningBackend();
    }
  };

  const startMiningBackend = async () => {
    if (!uid) return;

    try {
      const result = await mineForUser();

      if (result.status === "error") {
        toast({
          title: "Mining Error",
          description: result.message || "Could not start mining",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Mining Started",
        description: "24h mining activated",
      });
    } catch {
      toast({
        title: "Mining Error",
        description: "Unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDailyReward = async () => {
    if (!uid || dailyWaiting) return;

    if (window.AndroidBridge?.startDailyRewardedAd) {
      setDailyWaiting(true);
      try {
        window.AndroidBridge.setAdPurpose?.("daily");
        window.AndroidBridge.startDailyRewardedAd();
      } catch {
        setDailyWaiting(false);
        toast({
          title: "Ad Error",
          description: "Could not start rewarded ad",
          variant: "destructive",
        });
      }
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

  if (!uid) {
    return (
      <div className="text-center mt-20 text-lg text-red-500">
        User not authenticated
      </div>
    );
  }

  return (
    <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="pb-4">
        <h2 className="text-3xl font-bold text-center text-blue-600">
          Pall Mining ⛏️
        </h2>
      </CardHeader>

      <CardContent className="text-center space-y-6 px-6 pb-8">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Current Balance
          </p>
          <p className="text-3xl font-bold text-blue-600">
            {uiBalance.toFixed(8)} PALL
          </p>
        </div>

        {/* Mining Circle */}
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
                <p className="text-xs text-muted-foreground">Standard Mining</p>
              </>
            )}
          </div>
        </div>

        {/* Start Mining Button */}
        <Button
          disabled={mining || waitingForAd || !canStartMining}
          onClick={handleStartMining}
          className="w-full py-4 text-lg font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-lg"
        >
          {waitingForAd
            ? "📺 Showing Ad..."
            : mining
            ? `Mining ⛏ (${formatTime(timeRemaining)})`
            : "Start Mining ⛏"}
        </Button>

        {/* Daily Reward Card */}
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800 shadow-md">
          <h3 className="text-lg font-bold mb-2 text-center text-orange-600">
            Get Daily Reward
          </h3>

          <p className="text-center text-sm mb-4 text-muted-foreground">
            {claimedCount} / 10
          </p>

          <Button
            disabled={claimedCount >= 10 || dailyWaiting}
            onClick={handleDailyReward}
            className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow"
          >
            {dailyWaiting ? "📺 Showing Ad..." : "Watch Ad & Get 0.1 Pall"}
          </Button>

          {claimedCount < 10 && (
            <div className="mt-2 text-center text-yellow-600 animate-bounce">
              ⬆️
            </div>
          )}
        </Card>
      </CardContent>
    </Card>
  );
}