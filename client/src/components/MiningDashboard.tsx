// client/src/components/MiningDashboard.tsx

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// AdMob interface for TypeScript
declare global {
  interface Window {
    AdMob?: {
      rewardVideo?: {
        load: (options: { id: { android: string } }) => Promise<void>;
        show: () => Promise<void>;
        on: (event: string, callback: () => void) => void;
        off: (event: string, callback: () => void) => void; // ✅ Fixed here
      };
    };
    startMiningFromApp?: () => void;
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

  const [adLoaded, setAdLoaded] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [showingAd, setShowingAd] = useState(false);

  const { toast } = useToast();
  const baseMiningRate = 0.00001157; // 1 PALL / 24h
  const REWARDED_AD_UNIT_ID = "ca-app-pub-2948353344588284/3065938619"; // Rewarded Unit ID

  // -------------------------
  // Preload Rewarded Ad
  // -------------------------
  const loadRewardedAd = async () => {
    if (!window.AdMob?.rewardVideo || adLoading) return;
    try {
      setAdLoading(true);
      await window.AdMob.rewardVideo.load({ id: { android: REWARDED_AD_UNIT_ID } });
      setAdLoaded(true);
      console.log("✅ Rewarded ad loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load rewarded ad:", error);
      setAdLoaded(false);
    } finally {
      setAdLoading(false);
    }
  };

  useEffect(() => {
    loadRewardedAd();
    return () => {
      setAdLoaded(false);
      setAdLoading(false);
      setShowingAd(false);
    };
  }, []);

  // -------------------------
  // Expose function for Android
  // -------------------------
  useEffect(() => {
    window.startMiningFromApp = () => {
      startMining();
    };
  }, []);

  // -------------------------
  // Fetch wallet / mining status
  // -------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDoc(doc(db, "wallets", userId));
        if (snap.exists()) {
          const data = snap.data();
          setBalance(data.pallBalance || 0);

          if (data.lastStart && data.miningActive) {
            const lastTime = data.lastStart.toDate();
            const now = new Date();
            const elapsedSec = Math.floor((now.getTime() - lastTime.getTime()) / 1000);
            const maxSec = 24 * 60 * 60;

            if (elapsedSec >= maxSec) {
              const finalEarnings = maxSec * baseMiningRate;
              const finalBalance = (data.pallBalance || 0) + finalEarnings;

              await setDoc(
                doc(db, "wallets", userId),
                { pallBalance: finalBalance, miningActive: false, miningStopTime: now },
                { merge: true }
              );

              setBalance(finalBalance);
              setMining(false);
              setCanStartMining(true);
              setTimeRemaining(0);
              setLastStart(null);
            } else {
              const accrued = elapsedSec * baseMiningRate;
              const newBalance = (data.pallBalance || 0) + accrued;

              if (accrued > 0) {
                await setDoc(doc(db, "wallets", userId), { pallBalance: newBalance }, { merge: true });
                setBalance(newBalance);
              }

              setMining(true);
              setCanStartMining(false);
              setLastStart(lastTime);
              setTimeRemaining(maxSec - elapsedSec);
            }
          } else {
            setMining(false);
            setCanStartMining(true);
            setTimeRemaining(0);
            setLastStart(null);
          }
        } else {
          await setDoc(doc(db, "wallets", userId), { pallBalance: 0, miningActive: false });
        }
      } catch (err) {
        console.error("Error fetching mining data:", err);
      }
    };
    fetchData();
  }, [userId]);

  // -------------------------
  // Mining Timer & Balance Update
  // -------------------------
  useEffect(() => {
    let miningInterval: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;
    let saveInterval: NodeJS.Timeout;

    if (mining && lastStart) {
      let localBalance = balance;

      miningInterval = setInterval(() => {
        localBalance += baseMiningRate;
        setBalance(localBalance);
      }, 1000);

      saveInterval = setInterval(async () => {
        await setDoc(doc(db, "wallets", userId), { pallBalance: localBalance }, { merge: true });
      }, 10000);

      timerInterval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(miningInterval);
            clearInterval(saveInterval);
            clearInterval(timerInterval);
            setMining(false);
            setCanStartMining(true);
            setLastStart(null);
            setBalance(localBalance);

            setDoc(doc(db, "wallets", userId), {
              pallBalance: localBalance,
              miningActive: false,
              miningStopTime: new Date(),
            }, { merge: true });

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(miningInterval);
      clearInterval(timerInterval);
      clearInterval(saveInterval);
    };
  }, [mining, lastStart, baseMiningRate, userId]);

  // -------------------------
  // Show Rewarded Ad AFTER Mining Start
  // -------------------------
  const showRewardedAdAfterMining = async () => {
    if (!adLoaded || !window.AdMob?.rewardVideo) return;

    setShowingAd(true);
    let adCompleted = false;

    const onAdComplete = () => {
      adCompleted = true;
      setShowingAd(false);
      setAdLoaded(false);
      loadRewardedAd();
      toast({ title: "Ad Completed! 🎉", description: "Keep mining!" });

      window.AdMob?.rewardVideo.off("rewardVideo.reward", onAdComplete);
      window.AdMob?.rewardVideo.off("rewardVideo.close", onAdClosed);
    };

    const onAdClosed = () => {
      if (!adCompleted) {
        console.log("❌ Ad closed before completion");
        setShowingAd(false);
        setAdLoaded(false);
        loadRewardedAd();
      }
      window.AdMob?.rewardVideo.off("rewardVideo.reward", onAdComplete);
      window.AdMob?.rewardVideo.off("rewardVideo.close", onAdClosed);
    };

    window.AdMob.rewardVideo.on("rewardVideo.reward", onAdComplete);
    window.AdMob.rewardVideo.on("rewardVideo.close", onAdClosed);

    try {
      await window.AdMob.rewardVideo.show();
    } catch (err) {
      console.error("Failed to show ad:", err);
      setShowingAd(false);
      setAdLoaded(false);
      loadRewardedAd();
    }
  };

  // -------------------------
  // Start Mining Process
  // -------------------------
  const startMiningProcess = async () => {
    const now = new Date();
    setMining(true);
    setCanStartMining(false);
    setLastStart(now);
    setTimeRemaining(24 * 60 * 60);

    await setDoc(
      doc(db, "wallets", userId),
      { pallBalance: balance, miningActive: true, lastStart: now, miningStartTime: now },
      { merge: true }
    );

    toast({ title: "Mining Started! ⛏️", description: "You're earning PALL tokens!" });
  };

  const startMining = async () => {
    if (!canStartMining || showingAd) return;
    await startMiningProcess();

    if (adLoaded && window.AdMob?.rewardVideo) {
      showRewardedAdAfterMining();
    } else {
      toast({ title: "Ad Not Ready", description: "Please wait for ad to load.", variant: "destructive" });
    }
  };

  const formatTime = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hrs.toString().padStart(2,"0")}:${mins.toString().padStart(2,"0")}:${secs.toString().padStart(2,"0")}`;
  };

  const progressPercentage = timeRemaining > 0 ? ((24*60*60 - timeRemaining) / (24*60*60))*100 : 0;

  return (
    <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="pb-4">
        <h2 className="text-3xl font-bold text-center text-blue-600">Pall Mining ⛏️</h2>
      </CardHeader>
      <CardContent className="text-center space-y-6 px-6 pb-8">
        {/* Balance */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Current Balance</p>
          <p className="text-3xl font-bold text-blue-600">{balance.toFixed(8)} PALL</p>
        </div>

        {/* Mining Timer / Progress */}
        <div className="relative w-48 h-48 mx-auto">
          <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>
          {mining && timeRemaining > 0 && (
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-blue-500" strokeDasharray={`${progressPercentage*2.64} 264`} strokeLinecap="round" />
            </svg>
          )}
          <div className="absolute inset-4 bg-white dark:bg-card rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-blue-100 dark:border-blue-800">
            {mining ? (
              <>
                <div className="text-3xl mb-2">⛏️</div>
                <p className="text-base font-bold text-green-600">Mining Active</p>
                <p className="text-base font-bold text-muted-foreground">Standard Rate</p>
                <p className="text-base font-mono font-bold text-blue-600 mt-1">{formatTime(Math.floor(timeRemaining))}</p>
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

        {/* Ad Status */}
        {adLoading && <p className="text-sm text-blue-600">🔄 Loading reward ad...</p>}
        <p className="text-xs text-muted-foreground">Reward Ad: {adLoaded ? "✅ Ready" : adLoading ? "🔄 Loading..." : "❌ Not Loaded"}</p>

        {/* Mining Button */}
        <Button
          onClick={mining ? undefined : startMining}
          disabled={mining || !canStartMining || !adLoaded || showingAd}
          className={`w-full py-4 text-lg font-bold rounded-xl text-white ${mining ? "bg-orange-500" : showingAd ? "bg-blue-500" : canStartMining ? "bg-green-500 hover:bg-green-600" : "bg-gray-400"} shadow-lg`}
        >
          {mining ? `Mining ⛏ (${formatTime(Math.floor(timeRemaining))})` : showingAd ? "📺 Showing Reward Ad..." : canStartMining && adLoaded ? "Start Mining ⛏" : "⏳ Loading Ad..."}
        </Button>
      </CardContent>
    </Card>
  );
}
