// client/src/components/MiningDashboard.tsx
import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { claimDailyReward } from "@/lib/dailyReward";

declare global {
  interface Window {
    AndroidBridge?: {
      startDailyRewardedAd?: () => void;
      setAdPurpose?: (purpose: string) => void;
    };
    onAdCompleted?: () => void;
    onAdFailed?: () => void;
    onRewardAdCompleted?: () => void;
    onDailyAdReady?: () => void;
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
  const [adReady, setAdReady] = useState(false);

  const waitingForAdRef = useRef(false);
  const adPurposeRef = useRef<"daily" | null>(null);
  const { toast } = useToast();

  const baseMiningRate = 0.00001157;
  const MAX_SECONDS = 24 * 60 * 60;

  // ======================
  // GLOBAL CALLBACKS
  // ======================
  window.onRewardAdCompleted = () => window.dispatchEvent(new Event("rewardAdCompleted"));

  window.onAdFailed = () => {
    waitingForAdRef.current = false;
    setDailyWaiting(false);
    setAdReady(false);
    toast({
      title: "Ad Failed",
      description: "Rewarded ad could not load",
      variant: "destructive"
    });
  };

  useEffect(() => {
    window.onAdCompleted = () => {
      if (!waitingForAdRef.current) return;
      waitingForAdRef.current = false;
      window.dispatchEvent(new Event("rewardAdCompleted"));
    };
    return () => { window.onAdCompleted = undefined; };
  }, [toast]);

  // ======================
  // AUTH STATE
  // ======================
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => setUid(user ? user.uid : null));
    return () => unsubscribe();
  }, []);

  //================
  // DAILY AD HANDLER
  //================
  useEffect(() => {
    window.onDailyAdReady = () => setAdReady(true);
    return () => { window.onDailyAdReady = undefined; };
  }, []);

  // ======================
  // MINING SNAPSHOT
  // ======================
  useEffect(() => {
    const loadMining = async () => {
      if (!uid) return;
      const ref = doc(db, "wallets", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();
      if (!data.miningActive || !data.lastStart) return;

      let startMs = typeof data.lastStart === "number" ? data.lastStart : data.lastStart.toMillis();
      const elapsed = Math.floor((Date.now() - startMs) / 1000);

      setUiBalance((data.pallBalance || 0) + elapsed * baseMiningRate);
      setMining(true);
      setCanStartMining(false);
      setLastStart(new Date(startMs));
      setTimeRemaining(MAX_SECONDS - elapsed);
    };

    loadMining();
  }, [uid]);

  const resetMiningUI = () => { setMining(false); setCanStartMining(true); setTimeRemaining(0); setLastStart(null); };

  // ======================
  // DAILY REWARD SNAPSHOT & UTC+5 RESET
  // ======================
  useEffect(() => {
    const loadDaily = async () => {
      if (!uid) return;
      const ref = doc(db, "dailyRewards", uid);
      const snap = await getDoc(ref);

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
      const claimed = typeof data.claimedCount === "number" ? data.claimedCount : 0;
      setClaimedCount(claimed);
    };

    loadDaily();
  }, [uid]);

  // ======================
  // UTC+5 Daily Reset
  // ======================
  useEffect(() => {
    const resetDailyIfNeeded = async () => {
      if (!uid) return;
      const ref = doc(db, "dailyRewards", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();
      const lastReset = data.lastResetDate?.toDate?.() || new Date();
      const now = new Date();

      // UTC+5
      const nowUTC5 = new Date(now.getTime() + 5*60*60*1000);
      const lastUTC5 = new Date(lastReset.getTime() + 5*60*60*1000);

      if (
        nowUTC5.getUTCFullYear() !== lastUTC5.getUTCFullYear() ||
        nowUTC5.getUTCMonth() !== lastUTC5.getUTCMonth() ||
        nowUTC5.getUTCDate() !== lastUTC5.getUTCDate()
      ) {
        await updateDoc(ref, { claimedCount: 0, lastResetDate: serverTimestamp() });
        setClaimedCount(0);
        setAdReady(true);
      }
    };

    const interval = setInterval(resetDailyIfNeeded, 60*1000); // har minute check
    return () => clearInterval(interval);
  }, [uid]);

  // ======================
  // UI MINING TIMER
  // ======================
  useEffect(() => {
    if (!mining || !lastStart) return;
    const uiInterval = setInterval(() => setUiBalance(prev => prev + baseMiningRate), 1000);
    const countdown = setInterval(() => setTimeRemaining(prev => prev > 0 ? prev-1 : 0), 1000);
    return () => { clearInterval(uiInterval); clearInterval(countdown); };
  }, [mining, lastStart]);

  // ======================
  // FINAL 24H MINING
  // ======================
  useEffect(() => {
    if (!mining || !lastStart || !uid) return;
    const interval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - lastStart.getTime())/1000);
      if (elapsed < MAX_SECONDS) return;

      const ref = doc(db, "wallets", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      if (!data.miningActive) return;

      await updateDoc(ref, {
        pallBalance: (data.pallBalance||0) + 1,
        totalEarnings: (data.totalEarnings||0) + 1,
        miningActive: false,
        lastStart: null,
        lastMinedAt: serverTimestamp(),
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [mining, lastStart, uid]);

  // ======================
  // MINING POPUP
  // ======================
  const [miningStartedFromPopup, setMiningStartedFromPopup] = useState(false);
  useEffect(() => {
    if (!showMiningPopup) return;
    const timer = setTimeout(async () => {
      if (!miningStartedFromPopup) {
        setMiningStartedFromPopup(true);
        setShowMiningPopup(false);
        await startMiningBackend();
      }
    }, miningCountdown*1000);

    const countdown = setInterval(() => setMiningCountdown(prev => prev>0 ? prev-1 : 0), 1000);
    return () => { clearTimeout(timer); clearInterval(countdown); };
  }, [showMiningPopup, miningCountdown, miningStartedFromPopup]);

  // ======================
  // HANDLERS
  // ======================
  const startMiningBackend = async () => {
    if (!uid) return;
    try {
      const ref = doc(db, "wallets", uid);
      const snap = await getDoc(ref);
      const data = snap.data() || {};
      if (data.miningActive) return toast({ title: "Mining Active", description: "You already started mining in last 24h" });

      await updateDoc(ref, { miningActive:true, lastStart:serverTimestamp(), lastMinedAt:data.lastMinedAt||serverTimestamp() });
      setCanStartMining(false);
      toast({ title:"Mining Started", description:"24h mining activated" });
    } catch(e:any){ toast({ title:"Error", description:e.message||"Unexpected error", variant:"destructive" }); }
  };

  const completeDailyReward = async () => {
    if (!uid || claimedCount >= 10) return;
    const res = await claimDailyReward(uid);
    if (res.status === "success") {
      setUiBalance(prev => prev + 0.1);
      setClaimedCount(prev => prev + 1);
      setAdReady(false);
      toast({ title: "🎉 Reward Received", description: "+0.1 Pall added" });
    } else {
      toast({ title:"Daily Reward", description:res.message || "Already claimed", variant:"destructive" });
    }
    setDailyWaiting(false);
    waitingForAdRef.current = false;
    adPurposeRef.current = null;
  };

  const handleDailyReward = async () => {
    if (dailyWaiting || claimedCount >= 10 || !uid) return;

    if (!adReady && window.AndroidBridge?.startDailyRewardedAd) {
      toast({
        title: "Ad not ready",
        description: "Please wait a few seconds and try again",
        variant: "destructive",
      });

      return;
    }

    setDailyWaiting(true);
    waitingForAdRef.current = true;
    adPurposeRef.current = "daily";

    if (window.AndroidBridge?.startDailyRewardedAd) {
      window.AndroidBridge.setAdPurpose?.("daily");
      window.AndroidBridge.startDailyRewardedAd();
    } else {
      await completeDailyReward();
    }
  };

  // ======================
  // DAILY REWARDED AD LISTENER
  // ======================
  useEffect(() => {
    if (!uid) return;

    const rewardHandler = async () => {
      if (adPurposeRef.current !== "daily") return;
      await completeDailyReward();
    };

    window.addEventListener("rewardAdCompleted", rewardHandler);
    return () => window.removeEventListener("rewardAdCompleted", rewardHandler);
  }, [uid, claimedCount]);

  const formatTime = (s:number) => {
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
    return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
  };

  if(!uid) return <div className="text-center mt-20 text-lg text-red-500">User not authenticated</div>;

  return (
    <>
      {/* Balance Card */}
      <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader className="pb-4" />
        <CardContent className="text-center space-y-6 px-6 pb-8">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-2">Current Balance</p>
            <p className="text-3xl font-bold text-blue-600">{uiBalance.toFixed(8)} PALL</p>
          </div>

          {/* Mining Circle */}
          <div className="relative w-48 h-48 mx-auto">
            <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700" />
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
                  <div className="text-4xl mb-2">🎓</div>
                  <p className="text-sm font-semibold text-gray-600">Ready to Mine</p>
                  <p className="text-xs text-muted-foreground">Standard Mining</p>
                </>
              )}
            </div>
          </div>

          {/* Start Mining Button */}
          <Button
            disabled={mining || !canStartMining}
            onClick={() => { setShowMiningPopup(true); setMiningCountdown(30); setMiningStartedFromPopup(false); }}
            className="w-full py-4 text-lg font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-lg"
          >
            {mining ? `Mining ⛏ (${formatTime(timeRemaining)})` : "Start Mining ⛏"}
          </Button>

          {/* Daily Reward Card */}
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

      {/* Mining Popup */}
      {showMiningPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/70">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 w-[90%] max-w-sm text-center shadow-2xl">
            <h2 className="text-white text-xl font-semibold mb-4">Starting Mining…</h2>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-3xl font-bold text-white">{miningCountdown}s</p>
            <p className="text-sm text-white mt-2">Preparing your mining session</p>
          </div>
        </div>
      )}
    </>
  );
}
