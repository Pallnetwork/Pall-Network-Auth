// client/src/components/MiningDashboard.tsx
import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
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
  const [uiBalance, setUiBalance] = useState(0);
  const [mining, setMining] = useState(false);
  const [lastStart, setLastStart] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canStartMining, setCanStartMining] = useState(true);
  const [claimedCount, setClaimedCount] = useState(0);
  const [dailyWaiting, setDailyWaiting] = useState(false);
  const [showMiningPopup, setShowMiningPopup] = useState(false);
  const [miningCountdown, setMiningCountdown] = useState(30);

  const waitingForAdRef = useRef(false);
  const adPurposeRef = useRef<"mining" | "daily" | null>(null);
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
    setDailyWaiting(false);
    toast({
      title: "Ad Failed",
      description: "Rewarded ad could not load",
      variant: "destructive",
    });
  };

  useEffect(() => {
    window.onAdCompleted = async () => {
      if (!waitingForAdRef.current) return;
      waitingForAdRef.current = false;
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
      console.log("Auth State Changed → User:", user);
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
      console.log("Wallet Snapshot:", snap.exists(), snap.data());

      if (!snap.exists() || !snap.data().miningActive || !snap.data().lastStart) {
        setMining(false);
        setCanStartMining(true);
        setTimeRemaining(0);
        setLastStart(null);
        return;
      }

      const data = snap.data();
      let startMs: number;
      if (typeof data.lastStart === "number") startMs = data.lastStart;
      else if (data.lastStart.toMillis) startMs = data.lastStart.toMillis();
      else return;

      const elapsedSeconds = Math.floor((Date.now() - startMs) / 1000);
      setUiBalance((data.pallBalance || 0) + elapsedSeconds * baseMiningRate);
      setMining(true);
      setCanStartMining(false);
      setLastStart(new Date(startMs));
      setTimeRemaining(MAX_SECONDS - elapsedSeconds);
    });

    return () => unsub();
  }, [uid]);

  // ======================
  // DAILY REWARD SNAPSHOT & BUTTON LOGIC
  // ======================
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "dailyRewards", uid);

    const unsub = onSnapshot(ref, async (snap) => {
      console.log("DailyReward Snapshot:", snap.exists(), snap.data());

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
      const lastReset = data.lastResetDate?.toDate?.() || new Date(0);
      const claimed = typeof data.claimedCount === "number" ? data.claimedCount : 0;

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
  // FIRESTORE BALANCE UPDATE DURING MINING
  // ======================
  useEffect(() => {
    if (!mining || !lastStart || !uid) return;

    const interval = setInterval(async () => {
      const walletRef = doc(db, "wallets", uid);
      try {
        await updateDoc(walletRef, {
          pallBalance: uiBalance,
          lastMinedAt: serverTimestamp(),
        });
        console.log("✅ Firestore mining balance updated");
      } catch (e) {
        console.error("Firestore mining update failed:", e);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [mining, lastStart, uid, uiBalance]);

  // ======================
  // START MINING POPUP TIMER
  // ======================
  useEffect(() => {
    if (!showMiningPopup) return;

    // ✅ Start mining at 20s mark
    if (miningCountdown === 20) {
      startMiningBackend(); // 20s pe Firestore mining start
    }

    if (miningCountdown <= 0) {
      setShowMiningPopup(false);

      return;
    }

    const timer = setTimeout(() => {
      setMiningCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showMiningPopup, miningCountdown]);

  // ======================
  // REWARDED AD HANDLER
  // ======================
  useEffect(() => {
    if (!uid) return;

    const handler = async () => {
      const purpose = adPurposeRef.current;
      console.log("Reward Ad Completed → Purpose:", purpose);

      adPurposeRef.current = null;
      waitingForAdRef.current = false;
      setDailyWaiting(false);

      if (purpose === "mining") {
        const result = await mineForUser();
        console.log("mineForUser result:", result);
        if (result.status === "error") {
          toast({ title: "Mining Error", description: result.message || "Could not start mining", variant: "destructive" });
          return;
        }
        toast({ title: "Mining Started", description: "24h mining activated successfully" });
      }

      if (purpose === "daily") {
        const res = await claimDailyReward(uid);
        console.log("claimDailyReward result:", res);
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
  const startMiningBackend = async () => {
    if (!uid) return;
    try {
      const walletRef = doc(db, "wallets", uid);
      await updateDoc(walletRef, { miningActive: true, lastStart: serverTimestamp() });
      console.log("startMiningBackend: Success");
      toast({ title: "Mining Started", description: "24h mining activated" });
    } catch (e: any) {
      console.error("startMiningBackend Error:", e);
      toast({ title: "Mining Error", description: e.message || "Unexpected error occurred", variant: "destructive" });
    }
  };

  const startMiningAfterPopup = async () => {
    if (!uid) return;

    await startMiningBackend(); // Firestore
  };

  const handleDailyReward = () => {
    if (dailyWaiting || claimedCount >= 10) return;
    if (window.AndroidBridge?.startDailyRewardedAd) {
      setDailyWaiting(true);
      waitingForAdRef.current = true;
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
  <>
    <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="pb-4"></CardHeader>
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
                cx="50" cy="50" r="42"
                stroke="currentColor" strokeWidth="8" fill="none"
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
                <p className="text-base font-mono font-bold text-blue-600 mt-1">
                  {formatTime(timeRemaining)}
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">🎓</div>
                <p className="text-sm font-semibold text-gray-600">Ready to Mine</p>
                <p className="text-xs text-muted-foreground">Standard Mining</p>
              </>
            )}
          </div>
        </div>

        <Button
          disabled={mining || !canStartMining}
          onClick={() => {
            setShowMiningPopup(true);
            setMiningCountdown(30);
          }}
          className="w-full py-4 text-lg font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-lg"
        >
          {mining ? `Mining ⛏ (${formatTime(timeRemaining)})` : "Start Mining ⛏"}
        </Button>

        {/* DAILY REWARD */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-md mt-4">
          <h3 className="text-lg font-bold mb-2 text-center text-blue-600">Get Daily Reward</h3>
          <p className="text-center text-sm text-gray-600 mb-2">
            Watch a video ad to get <span className="font-bold text-blue-600">0.1 Pall</span>
          </p>
          <p className="text-center text-sm mb-4">
            <span className="font-bold text-blue-500">{claimedCount} 🔶 10</span>
          </p>

          <Button
            disabled={dailyWaiting || claimedCount >= 10}
            onClick={handleDailyReward}
            className={`w-full py-3 rounded-xl font-bold shadow transition ${
              claimedCount >= 10
                ? "bg-gray-400 text-gray-700 cursor-not-allowed opacity-60"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {dailyWaiting
              ? "📺 Showing Ad..."
              : claimedCount < 10
              ? `Watch Ad & Get 0.1 Pall 🎁 (${claimedCount}/10)`
              : "Daily Reward Completed ✨"}
          </Button>

          {claimedCount < 10 && (
            <div className="mt-2 flex justify-center animate-bounce [animation-duration:0.8s]">
              <span className="text-orange-500 font-extrabold text-3xl leading-none">🎉</span>
            </div>
          )}
        </Card>
      </CardContent>
    </Card>

    {/* MINING POPUP */}
    {showMiningPopup && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-green/70">
        <div className="bg-[#0f172a] rounded-2xl p-8 w-[90%] max-w-sm text-center shadow-2xl">
          <h2 className="text-white text-xl font-semibold mb-4">
            Starting Mining…
          </h2>

          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <p className="text-3xl font-bold text-blue-400">
            {miningCountdown}s
          </p>

          <p className="text-sm text-gray-400 mt-2">
            Preparing your mining session
          </p>
        </div>
      </div>
    )}
  </>);
}
