import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import StartMiningPopup from "@/components/StartMiningPopup";
import { claimDailyReward } from "@/lib/dailyReward";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SECONDS = 24 * 60 * 60;

declare global {
  interface Window {
    AndroidBridge?: {
      startDailyRewardedAd?: () => void;
      setAdPurpose?: (purpose: string) => void;
    };
    onRewardAdCompleted?: () => void;
    onAdFailed?: () => void;
    onAdCompleted?: () => void;
  }
}

export default function MiningDashboard() {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid || null);
  const [balance, setBalance] = useState(0);

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [miningActive, setMiningActive] = useState(false);
  const [multiplier, setMultiplier] = useState(0.5);

  const [claimedCount, setClaimedCount] = useState(0);
  const [dailyWaiting, setDailyWaiting] = useState(false);
  const [showMiningPopup, setShowMiningPopup] = useState(false);

  const waitingForAdRef = useRef(false);
  const adPurposeRef = useRef<"mining" | "daily" | null>(null);

  const { toast } = useToast();

  // ======================
  // GLOBAL CALLBACKS
  // ======================
  useEffect(() => {
    window.onAdCompleted = () => {
      console.log("🔥 onAdCompleted called from Android");
      window.dispatchEvent(new Event("rewardAdCompleted"));
    };

    window.onRewardAdCompleted = () => {
      console.log("🔥 onRewardAdCompleted called from Android");
      window.dispatchEvent(new Event("rewardAdCompleted"));
    };

    window.onAdFailed = () => {
      console.log("❌ Ad failed");
      waitingForAdRef.current = false;
      setDailyWaiting(false);
      toast({
        title: "Ad Failed",
        description: "Rewarded ad could not load",
        variant: "destructive",
      });
    };
  }, [toast]);

  // ======================
  // AUTH STATE
  // ======================
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) =>
      setUid(user ? user.uid : null)
    );
    return () => unsub();
  }, []);

  // ======================
  // WALLET SNAPSHOT + TIMER
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

          setTimeRemaining(Math.floor(remaining / 1000));

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

  // ======================
  // DAILY REWARD SNAPSHOT
  // ======================
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "dailyRewards", uid);

    const unsub = onSnapshot(ref, async (snap) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!snap.exists()) {
        await setDoc(ref, {
          claimedCount: 0,
          lastResetDate: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        setClaimedCount(0);
        return;
      }

      const data = snap.data();
      const lastReset = data.lastResetDate?.toDate?.();
      const claimed =
        typeof data.claimedCount === "number" ? data.claimedCount : 0;

      if (lastReset && lastReset.getTime() < today.getTime()) {
        setClaimedCount(0);
      } else {
        setClaimedCount(claimed);
      }
    });

    return () => unsub();
  }, [uid]);

  // ======================
  // CENTRAL REWARD HANDLER
  // ======================
  useEffect(() => {
    if (!uid) return;

    const handler = async () => {
      const purpose = adPurposeRef.current;

      adPurposeRef.current = null;
      waitingForAdRef.current = false;
      setDailyWaiting(false);

      if (purpose === "daily") {
        const res = await claimDailyReward(uid);

        if (res.status === "success") {
          toast({
            title: "🎉 Reward Received",
            description: "+0.1 Pall added successfully",
          });
        } else {
          toast({
            title: "Daily Reward",
            description: res.message || "Reward already claimed",
            variant: "destructive",
          });
        }
      }
    };

    window.addEventListener("rewardAdCompleted", handler);
    return () =>
      window.removeEventListener("rewardAdCompleted", handler);
  }, [uid, toast]);

  // ======================
  // DAILY REWARD BUTTON
  // ======================
  const handleDailyReward = () => {
    if (dailyWaiting || claimedCount >= 10) return;

    if (window.AndroidBridge?.startDailyRewardedAd) {
      setDailyWaiting(true);
      adPurposeRef.current = "daily";
      window.AndroidBridge.setAdPurpose?.("daily");
      window.AndroidBridge.startDailyRewardedAd();
    }
  };

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  if (!uid) {
    return (
      <div className="text-center mt-20 text-lg text-red-500">
        User not authenticated
      </div>
    );
  }

  return (
    <>
      <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader />
        <CardContent className="text-center space-y-6 px-6 pb-8">
          {/* BALANCE */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Current Balance
            </p>
            <p className="text-3xl font-bold text-blue-600">
              {balance.toFixed(8)} PALL
            </p>
          </div>

          {/* MINING CIRCLE */}
          <div className="relative w-48 h-48 mx-auto">
            <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>

            {miningActive && timeRemaining > 0 && (
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
                    ((MAX_SECONDS - timeRemaining) / MAX_SECONDS) * 264
                  }
                  strokeLinecap="round"
                />
              </svg>
            )}

            <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-blue-100 dark:border-blue-800">
              {miningActive ? (
                <>
                  <div className="text-3xl mb-2">⛏️</div>
                  <p className="text-base font-bold text-green-600">
                    Mining Active
                  </p>
                  <p className="text-base font-bold text-muted-foreground">
                    {multiplier === 1 ? "2× Mining" : "Normal Mining"}
                  </p>
                  <p className="text-base font-mono font-bold text-blue-600 mt-1">
                    {formatTime(timeRemaining)}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-2">🎓</div>
                  <p className="text-sm font-semibold text-gray-600">
                    Ready to Mine
                  </p>
                </>
              )}
            </div>
          </div>

          {/* START MINING BUTTON */}
          <Button
            onClick={() => setShowMiningPopup(true)}
            className="w-full py-4 text-lg font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-lg"
          >
            Start Mining ⛏
          </Button>

          <p className="text-sm text-muted-foreground font-medium">
            Claim for normal reward
            <span className="font-bold text-blue-600"> | 2× Claim:</span> watch ad to double
          </p>

          {/* DAILY REWARD */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-md mt-4">
            <h3 className="text-lg font-bold mb-2 text-center text-blue-600">
              Get Daily Reward
            </h3>
            <p className="text-center text-sm mb-4">
              <span className="font-bold text-blue-500">
                {claimedCount} 🔶 10
              </span>
            </p>

            <Button
              disabled={dailyWaiting || claimedCount >= 10}
              onClick={handleDailyReward}
              className={`w-full py-3 rounded-xl font-bold shadow transition
                ${
                  claimedCount >= 10
                    ? "bg-gray-400 text-gray-700 cursor-not-allowed opacity-60"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }
              `}
            >
              {dailyWaiting
                ? "📺 Showing Ad..."
                : claimedCount < 10
                ? `Watch Ad & Get 0.1 Pall 🎁 (${claimedCount}/10)`
                : "Daily Reward Completed ✨"}
            </Button>
          </Card>
        </CardContent>
      </Card>

      {/* START MINING POPUP */}
      {showMiningPopup && uid && (
        <StartMiningPopup
          uid={uid}
          onClose={() => setShowMiningPopup(false)}
        />
      )}
    </>
  );
}