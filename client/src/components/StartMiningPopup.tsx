import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

interface StartMiningPopupProps {
  uid: string;
  onClose: () => void;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function StartMiningPopup({ uid, onClose }: StartMiningPopupProps) {
  const { toast } = useToast();
  const [miningActive, setMiningActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(ONE_DAY_MS);
  const [waitingAd, setWaitingAd] = useState(false);
  const [localBalance, setLocalBalance] = useState(0); // incremental balance
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ======================
  // Load initial balance & lastStart
  // ======================
  useEffect(() => {
    const fetchWallet = async () => {
      const walletRef = doc(db, "wallets", uid);
      const snap = await walletRef.get();
      if (!snap.exists()) return;

      const data = snap.data();
      const mining = data?.miningActive ?? false;
      const lastStart = data?.lastStart?.toDate?.() || null;
      const baseBalance = data?.pallBalance ?? 0;

      setLocalBalance(baseBalance);

      if (mining && lastStart) {
        const elapsed = Date.now() - lastStart.getTime();
        setTimeRemaining(Math.max(ONE_DAY_MS - elapsed, 0));
        setMiningActive(true);
      }
    };

    fetchWallet();
  }, [uid]);

  // ======================
  // TIMER + incremental balance
  // ======================
  useEffect(() => {
    if (!miningActive) return;

    intervalRef.current = setInterval(async () => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(intervalRef.current!);
          setMiningActive(false);
          toast({ title: "⛏ Mining Completed", description: "24h mining done!" });
          incrementFinalBalance();
          return 0;
        }
        return prev - 1000;
      });

      // Increment local balance gradually
      setLocalBalance(prev => prev + 0.5 / ONE_DAY_MS * 1000);

    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [miningActive]);

  // ======================
  // Add final 0.5 PALL to Firestore
  // ======================
  const incrementFinalBalance = async () => {
    const walletRef = doc(db, "wallets", uid);
    try {
      await updateDoc(walletRef, {
        pallBalance: serverTimestamp() ? localBalance + 0.5 : localBalance + 0.5, // atomic increment
        miningActive: false,
        lastStart: null,
        lastMinedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Error updating final balance:", err);
    }
  };

  // ======================
  // Format timer
  // ======================
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const styleNumber = (n: number) => <span style={{ fontWeight:"bold", textShadow:"1px 1px 2px rgba(0,0,0,0.3)" }}>{n.toString().padStart(2,"0")}</span>;
    return <>{styleNumber(h)}:{styleNumber(m)}:{styleNumber(s)}</>;
  };

  // ======================
  // NORMAL MINING
  // ======================
  const handleNormalMining = async () => {
    try {
      const res = await fetch("/api/mining/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start mining");

      setMiningActive(true);
      setTimeRemaining(ONE_DAY_MS);
      toast({ title: "Mining Started", description: "Normal 24h mining started!" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Mining start failed", variant: "destructive" });
    }
  };

  // ======================
  // AD MINING (optional)
  // ======================
  const handleAdMining = async () => {
    try {
      setWaitingAd(true);
      if (window.AndroidBridge?.startMiningRewardedAd) {
        window.AndroidBridge.setAdPurpose?.("mining");
        window.AndroidBridge.startMiningRewardedAd();
        const onAdComplete = async () => {
          window.removeEventListener("rewardAdCompleted", onAdComplete);
          await startMiningAfterAd();
        };
        window.addEventListener("rewardAdCompleted", onAdComplete);
      } else {
        setTimeout(startMiningAfterAd, 3000);
      }
    } catch (err: any) {
      setWaitingAd(false);
      toast({ title: "Ad Error", description: err.message || "Ad failed", variant: "destructive" });
    }
  };

  const startMiningAfterAd = async () => {
    try {
      const res = await fetch("/api/mining/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start mining after ad");

      setMiningActive(true);
      setTimeRemaining(ONE_DAY_MS);
      setWaitingAd(false);
      toast({ title: "2× Mining Started", description: "24h mining activated after ad!" });
      onClose();
    } catch (err: any) {
      setWaitingAd(false);
      toast({ title: "Error", description: err.message || "Mining start failed", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <Card className="max-w-md w-full rounded-2xl shadow-lg border-0 bg-white dark:bg-gray-800 p-6">
        <CardContent className="space-y-6 text-center">
          <h2 className="text-xl font-bold text-blue-600">Start Mining ⛏</h2>

          {/* Timer & Incremental Balance */}
          <div className="relative w-48 h-48 mx-auto">
            <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>
            {miningActive && (
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none"
                  className="text-blue-500"
                  strokeDasharray="264"
                  strokeDashoffset={264 - ((ONE_DAY_MS - timeRemaining) / ONE_DAY_MS) * 264}
                  strokeLinecap="round"
                />
              </svg>
            )}
            <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-blue-100 dark:border-blue-800">
              <p className="text-2xl font-mono font-bold text-blue-600">{formatTime(timeRemaining)}</p>
              <p className="text-sm mt-1">Balance: {localBalance.toFixed(8)} PALL</p>
            </div>
          </div>

          {/* Buttons */}
          <Button disabled={miningActive || waitingAd} onClick={handleNormalMining}
            className="w-full py-4 text-lg font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-lg">
            Normal Mining ⛏
          </Button>

          <Button disabled={miningActive || waitingAd} onClick={handleAdMining}
            className="w-full py-4 text-lg font-bold rounded-xl text-white bg-purple-600 hover:bg-purple-700 shadow-lg">
            {waitingAd ? "📺 Showing Ad..." : "2× Mining (Watch Ad)"}
          </Button>

          <Button variant="outline" className="w-full py-2 mt-2" onClick={onClose}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
