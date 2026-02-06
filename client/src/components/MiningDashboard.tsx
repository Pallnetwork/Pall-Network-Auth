import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import StartMiningPopup from "@/components/StartMiningPopup";
import { claimDailyReward } from "@/lib/dailyReward";

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

export default function MiningDashboard() {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid || null);
  const [balance, setBalance] = useState(0);

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
      window.dispatchEvent(new Event("rewardAdCompleted"));
    };

    window.onRewardAdCompleted = () => {
      window.dispatchEvent(new Event("rewardAdCompleted"));
    };

    window.onAdFailed = () => {
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
  // WALLET SNAPSHOT
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

      setBalance(baseBalance);
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
  // CENTRAL REWARD HANDLER (OLD WORKING LOGIC)
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
          setClaimedCount((prev) => Math.min(prev + 1, 10));
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

          {/* START MINING BUTTON */}
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
