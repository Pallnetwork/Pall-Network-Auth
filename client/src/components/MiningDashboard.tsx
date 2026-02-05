import React, { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import StartMiningPopup from "@/components/StartMiningPopup";

declare global {
  interface Window {
    AndroidBridge?: {
      startDailyRewardedAd?: () => void;
      setAdPurpose?: (purpose: string) => void;
    };
    onRewardAdCompleted?: () => void;
    onAdFailed?: () => void;
  }
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function MiningDashboard() {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid || null);
  const [balance, setBalance] = useState(0);
  const [claimedCount, setClaimedCount] = useState(0);
  const [dailyWaiting, setDailyWaiting] = useState(false);
  const [showMiningPopup, setShowMiningPopup] = useState(false);

  const { toast } = useToast();

  // ======================
  // AUTH STATE
  // ======================
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUid(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  // ======================
  // WALLET SNAPSHOT + incremental balance for 24h mining
  // ======================
  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, "wallets", uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (!data) return;

      const baseBalance = typeof data.pallBalance === "number" ? data.pallBalance : 0;
      const lastStart = data.lastStart?.toDate?.() || null;
      const miningActive = data.miningActive ?? false;

      if (miningActive && lastStart) {
        // Incremental balance counting
        const interval = setInterval(() => {
          const elapsed = Date.now() - lastStart.getTime();
          const progress = Math.min(elapsed / ONE_DAY_MS, 1);
          setBalance(baseBalance + 0.5 * progress);
        }, 1000);

        return () => clearInterval(interval);
      } else {
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
      
      // 🕛 today midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 👤 first time user
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

      const lastReset =
        data.lastResetDate?.toDate?.() || new Date(0);

      const claimed =
        typeof data.claimedCount === "number"
          ? data.claimedCount
          : 0;
      
      // 🔄 new day → reset    
      if (lastReset < today) {
        await updateDoc(ref, {
          claimedCount: 0,
          lastResetDate: serverTimestamp(),
        });
        setClaimedCount(0);
      } else {
        setClaimedCount(claimed);
      }
    });

    return () => unsub();
  }, [uid]);

  // ======================
  // DAILY REWARD AD CALLBACKS
  // ======================
  useEffect(() => {
    window.onAdFailed = () => {
      setDailyWaiting(false);
      toast({
        title: "Ad Failed",
        description: "Rewarded ad could not load",
        variant: "destructive",
      });
    };
  }, [toast]);

  // ======================
  // DAILY REWARD HANDLER
  // ======================
  const handleDailyReward = () => {
    if (dailyWaiting || claimedCount >= 10) return;

    if (window.AndroidBridge?.startDailyRewardedAd) {
      setDailyWaiting(true);
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

          {/* START MINING BUTTON (POPUP ONLY) */}
          <Button
            onClick={() => setShowMiningPopup(true)}
            className="w-full py-4 text-lg font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-lg"
          >
            Start Mining ⛏
          </Button>

          {/* DAILY REWARD */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-md mt-4">
            <h3 className="text-lg font-bold mb-2 text-center text-blue-600">
              Get Daily Reward
            </h3>
            <p className="text-center text-sm mb-4">
              <span className="font-bold text-blue-500">{claimedCount} 🔶 10</span>
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

            {claimedCount < 10 && (
              <div className="mt-2 flex justify-center animate-bounce [animation-duration:0.8s]">
                <span className="text-orange-500 font-extrabold text-3xl leading-none">
                  🎉
                </span>
              </div>
            )}
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
