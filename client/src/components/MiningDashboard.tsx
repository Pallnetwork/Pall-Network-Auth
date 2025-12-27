// client/src/components/MiningDashboard.tsx

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    AdMob?: {
      rewardVideo?: {
        load: (options: { id: { android: string } }) => Promise<void>;
        show: () => Promise<void>;
        on: (event: string, callback: () => void) => void;
        off: (event: string, callback: () => void) => void;
      };
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

  // Rewarded Ad State
  const [adLoaded, setAdLoaded] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [showingAd, setShowingAd] = useState(false);

  const baseMiningRate = 0.00001157;
  const MAX_SECONDS = 24 * 60 * 60;
  const REWARDED_AD_ID = "ca-app-pub-2948353344588284/3065938619";

  /* ===============================
     Load Rewarded Ad
  ================================ */
  const loadRewardedAd = async () => {
    if (!window.AdMob?.rewardVideo || adLoading) return;
    try {
      setAdLoading(true);
      await window.AdMob.rewardVideo.load({ id: { android: REWARDED_AD_ID } });
      setAdLoaded(true);
      console.log("✅ Rewarded ad loaded");
    } catch {
      setAdLoaded(false);
      console.log("❌ Rewarded ad failed to load");
    } finally {
      setAdLoading(false);
    }
  };

  /* ===============================
     Fetch Wallet Data
  ================================ */
  useEffect(() => {
    const fetchData = async () => {
      const ref = doc(db, "wallets", userId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, { pallBalance: 0, miningActive: false });
        return;
      }

      const data = snap.data();
      setBalance(data.pallBalance || 0);

      if (data.miningActive && data.lastStart) {
        const start = data.lastStart.toDate();
        const elapsed = Math.floor((new Date().getTime() - start.getTime()) / 1000);

        if (elapsed >= MAX_SECONDS) {
          const finalBalance = (data.pallBalance || 0) + MAX_SECONDS * baseMiningRate;
          await setDoc(ref, { pallBalance: finalBalance, miningActive: false }, { merge: true });
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
     Mining Timer
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

          setDoc(ref, { pallBalance: localBalance, miningActive: false }, { merge: true });
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
     Start Mining Logic
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
      { pallBalance: balance, miningActive: true, lastStart: now },
      { merge: true }
    );

    toast({ title: "Mining Started! ⛏️", description: "You're earning PALL tokens!" });
  };

  const startMining = async () => {
    if (!canStartMining || mining || showingAd) return;

    if (!adLoaded || !window.AdMob?.rewardVideo) {
      toast({ title: "Ad Not Ready", description: "Please try again later.", variant: "destructive" });
      loadRewardedAd();
      return;
    }

    setShowingAd(true);

    const onAdComplete = async () => {
      setShowingAd(false);
      setAdLoaded(false);
      await startMiningProcess();
      loadRewardedAd();
      window.AdMob?.rewardVideo?.off("rewardVideo.reward", onAdComplete);
      window.AdMob?.rewardVideo?.off("rewardVideo.close", onAdClosed);
      toast({ title: "Ad Completed! 🎉", description: "Keep mining!" });
    };

    const onAdClosed = () => {
      if (showingAd) setShowingAd(false);
      window.AdMob?.rewardVideo?.off("rewardVideo.reward", onAdComplete);
      window.AdMob?.rewardVideo?.off("rewardVideo.close", onAdClosed);
      loadRewardedAd();
    };

    window.AdMob.rewardVideo.on("rewardVideo.reward", onAdComplete);
    window.AdMob.rewardVideo.on("rewardVideo.close", onAdClosed);

    try {
      await window.AdMob.rewardVideo.show();
    } catch {
      setShowingAd(false);
      setAdLoaded(false);
      loadRewardedAd();
      toast({ title: "Ad Failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
  };

  const progressPercentage = timeRemaining > 0 ? ((MAX_SECONDS - timeRemaining) / MAX_SECONDS) * 100 : 0;

  /* ===============================
     UI (OLD DESIGN PRESERVED)
  ================================ */
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

        {/* Mining Circle */}
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
                strokeDasharray={`${progressPercentage * 2.64} 264`}
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

        {/* Mining Button */}
        <Button
          onClick={startMining}
          disabled={mining || showingAd || !canStartMining}
          className={`w-full py-4 text-lg font-bold rounded-xl text-white ${
            mining ? "bg-orange-500" : showingAd ? "bg-blue-500" : "bg-green-500 hover:bg-green-600"
          } shadow-lg`}
        >
          {mining ? `Mining ⛏ (${formatTime(timeRemaining)})` : showingAd ? "📺 Showing Ad..." : "Start Mining ⛏"}
        </Button>

        {/* Ad Status */}
        <p className="text-xs text-muted-foreground">
          Reward Ad: {adLoaded ? "✅ Ready" : adLoading ? "🔄 Loading..." : "❌ Not Loaded"}
        </p>
      </CardContent>
    </Card>
  );
}
