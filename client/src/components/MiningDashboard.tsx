// client/src/components/MiningDashboard.tsx
import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { mineForUser } from "@/lib/mine";
import { claimDailyReward } from "@/lib/dailyReward";

declare global {
  interface Window {
    AndroidBridge?: {
      startMiningRewardedAd: () => void;
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
  const [dailyCooldown, setDailyCooldown] = useState(0);

  const waitingForAdRef = useRef(false);
  const adPurposeRef = useRef<"mining" | "daily" | null>(null);

  const [claimedCount, setClaimedCount] = useState(0);
  const [dailyWaiting, setDailyWaiting] = useState(false);

  const { toast } = useToast();

  const baseMiningRate = 0.00001157;
  const MAX_SECONDS = 24 * 60 * 60;

  // ======================
  // GLOBAL CALLBACKS
  // ======================
  window.onRewardAdCompleted = () => {
    window.dispatchEvent(new Event("rewardAdCompleted"));
  };

  window.onAdFailed = () => {
    waitingForAdRef.current = false;
    setWaitingForAd(false);
    setDailyWaiting(false);
    toast({
     title: "Ad Failed",
     description: "Rewarded ad could not load",
     variant: "destructive" ,
    });
  };

  useEffect(() => {
    window.onAdCompleted = async () => {
      if (!waitingForAdRef.current) return;

      // ❌ IMPORTANT: yahan mining start nahi hogi
      waitingForAdRef.current = false;
      setWaitingForAd(false);

      // sirf signal dispatch hoga
      window.dispatchEvent(new Event("rewardAdCompleted"));
    };

    return () => {
      window.onAdCompleted = undefined;
    };
  }, [toast]);

  // ======================
  // AUTH STATE
  // ======================
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUid(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // ======================
  // MINING SNAPSHOT
  // ======================
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "wallets", uid);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.exists() ? snap.data() : null;

      // Update balance
      if (data && typeof data.pallBalance === "number") {
        setBalance(data.pallBalance);
        if (!mining) setUiBalance(data.pallBalance);
      }

      // Mining active check
      if (data && data.miningActive && data.lastStart) {
        const start = data.lastStart.toDate ? data.lastStart.toDate() : new Date(data.lastStart.seconds * 1000);
        const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);

        const minedAmount = elapsed * baseMiningRate;
        setUiBalance((data.pallBalance || 0) + minedAmount);

        if (elapsed >= MAX_SECONDS) {
          // 🔥 AUTO CLAIM BACKEND
          fetch("/api/mining/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uid }),
          }).catch(() => {});

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
    });

    return () => unsub();
  }, [uid]);

  // ======================
  // DAILY REWARD SNAPSHOT
  // ======================
  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, "dailyRewards", uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setClaimedCount(0);
        return;
      }

      const data = snap.data();

      // ads count
      if (typeof data.claimedCount === "number") {
        setClaimedCount(data.claimedCount);
      }

      // 🔒 only INITIALIZE cooldown (not overwrite)
      if (data.claimedCount >= 10 && data.lastClaim) {
        const last =
        typeof data.lastClaim.toDate === "function"
        ? data.lastClaim.toDate()
        : new Date(data.lastClaim.seconds * 1000);

        const elapsed = Math.floor((Date.now() - last.getTime()) / 1000);
        const remaining = 24 * 60 * 60 - elapsed;

        if (remaining > 0 && dailyCooldown === 0) {
          setDailyCooldown(remaining);
        }
      }
    });

    return () => unsub();
  }, [uid, dailyCooldown]);

  // ======================
  // ⏳ DAILY REWARD UI TIMER (24h countdown)
  // ======================
  useEffect(() => {
    if (dailyCooldown <= 0) return;

    const interval = setInterval(() => {
      setDailyCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dailyCooldown]);

  // ======================
  // UI MINING TIMER
  // ======================
  useEffect(() => {
    if (!mining || !lastStart) return;

    const uiInterval = setInterval(() => setUiBalance((prev) => prev + baseMiningRate), 1000);
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

  // ======================
  // REWARDED AD HANDLER
  // ======================
  useEffect(() => {
    if (!uid) return;

    const handler = async () => {
      const purpose = adPurposeRef.current;
      adPurposeRef.current = null;
      waitingForAdRef.current = false;
      setWaitingForAd(false);
      setDailyWaiting(false);

      if (purpose === "mining") {
        const result = await mineForUser();
        if (result.status === "error") {
          toast({ title: "Mining Error", description: result.message || "Could not start mining", variant: "destructive" });
          return;
        }
        toast({ title: "Mining Started", description: "24h mining activated successfully" });
      }

      if (purpose === "daily") {
        const res = await claimDailyReward(uid);
        if (res.status === "success") {
          setUiBalance((p) => p + 0.1);
          toast({ title: "🎉 Reward Received", description: "+0.1 Pall added successfully" });
        } else {
          toast({ title: "Daily Reward", description: res.message || "Reward already claimed", variant: "destructive" });
        }
      }
    };

    window.addEventListener("rewardAdCompleted", handler);
    return () => window.removeEventListener("rewardAdCompleted", handler);
  }, [uid, toast]);

  // ======================
  // HANDLERS
  // ======================
  const handleStartMining = () => {
    if (waitingForAdRef.current || !canStartMining) return;

    if (window.AndroidBridge?.startMiningRewardedAd) {
      waitingForAdRef.current = true;
      setWaitingForAd(true);
      adPurposeRef.current = "mining";
      window.AndroidBridge.setAdPurpose?.("mining");
      window.AndroidBridge.startMiningRewardedAd();
    } else {
      startMiningBackend();
    }
  };

  const startMiningBackend = async () => {
    if (!uid) return;
    try {
      const result = await mineForUser();
      if (result.status === "error") {
        toast({ title: "Mining Error", description: result.message || "Could not start mining", variant: "destructive" });
        return;
      }
      toast({ title: "Mining Started", description: "24h mining activated" });
    } catch {
      toast({ title: "Mining Error", description: "Unexpected error occurred", variant: "destructive" });
    }
  };

  const handleDailyReward = () => {
    if (dailyWaiting || claimedCount >= 10) return;

    if (window.AndroidBridge?.startDailyRewardedAd) {
      setDailyWaiting(true);
      adPurposeRef.current = "daily";
      window.AndroidBridge.setAdPurpose?.("daily");
      window.AndroidBridge.startDailyRewardedAd();
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!uid) return <div className="text-center mt-20 text-lg text-red-500">User not authenticated</div>;

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

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-md">
          <h3 className="text-lg font-bold mb-2 text-center text-blue-600">Get Daily Reward</h3>
          <p className="text-center text-sm mb-4">
            <span className="font-bold text-blue-500">{claimedCount} 🔶 10</span>
          </p>
          <Button
            disabled={dailyWaiting || dailyCooldown > 0}
            onClick={handleDailyReward}
            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold shadow"
          >
            {
              dailyWaiting
              ? "📺 Showing Ad..."
              : dailyCooldown > 0
              ? `Reward ⛏ (${formatTime(dailyCooldown)})`
              : "Watch Ad & Get 0.1 Pall 🎁"
            }
          </Button>
          
          {claimedCount < 10 && <div className="mt-2 flex justify-center animate-bounce [animation-duration:0.8s]">
            <span className="text-orange-500 font-extrabold text-3xl leading-none">🎉</span></div>}
        </Card>
      </CardContent>
    </Card>
  );
}
