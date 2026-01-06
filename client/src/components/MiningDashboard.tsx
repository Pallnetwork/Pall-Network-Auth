// client/src/components/MiningDashboard.tsx
import React, { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { startMining } from "../lib/mine";

interface MiningDashboardProps {
  userId: string;
}

export default function MiningDashboard({ userId }: MiningDashboardProps) {
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [uiBalance, setUiBalance] = useState(0);
  const [mining, setMining] = useState(false);
  const [lastStart, setLastStart] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canStartMining, setCanStartMining] = useState(true);
  const [waitingForAd, setWaitingForAd] = useState(false);

  const MAX_SECONDS = 24 * 60 * 60; // 24h mining session
  const isAndroidApp = typeof window !== "undefined" && !!window.Android;
  const baseMiningRate = 0.00001157;

  /* ===============================
     FIRESTORE BALANCE SNAPSHOT
  ================================ */
  useEffect(() => {
    const ref = doc(db, "wallets", userId);

    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) {
        setDoc(ref, { pallBalance: 0, miningActive: false }, { merge: true });
        return;
      }

      const data = snap.data();
      if (typeof data.pallBalance === "number") {
        setBalance(data.pallBalance);
        if (!mining) setUiBalance(data.pallBalance);
      }

      if (data.miningActive && data.lastStart) {
        const start = data.lastStart.toDate();
        const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);

        if (elapsed >= MAX_SECONDS) {
          setMining(false);
          setCanStartMining(true);
          setTimeRemaining(0);
          setLastStart(null);
          setUiBalance(data.pallBalance);
          setDoc(ref, { miningActive: false }, { merge: true });
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
  }, [userId]);

  /* ===============================
     MINING TIMER + UI BALANCE
  ================================ */
  useEffect(() => {
    if (!mining || !lastStart) return;
    let localBalance = balance;

    const uiInterval = setInterval(() => setUiBalance(prev => prev + baseMiningRate), 1000);

    const cloudInterval = setInterval(async () => {
      try {
        await startMining(userId); // call secure backend
        localBalance += baseMiningRate * 10;
        setBalance(localBalance);
      } catch (err) {
        console.error("Mining API failed:", err);
      }
    }, 10000);

    const countdown = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(uiInterval);
          clearInterval(cloudInterval);
          clearInterval(countdown);
          setMining(false);
          setCanStartMining(true);
          setLastStart(null);
          setUiBalance(localBalance);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(uiInterval);
      clearInterval(cloudInterval);
      clearInterval(countdown);
    };
  }, [mining, lastStart, balance, userId]);

  /* ===============================
     START MINING BUTTON
  ================================ */
  const handleStartMining = () => {
    if (waitingForAd || mining) return;
    setWaitingForAd(true);

    if (isAndroidApp && window.Android?.showRewardedAd) {
      window.Android.showRewardedAd();
      // fallback 5 sec
      setTimeout(async () => {
        if (waitingForAd) {
          setWaitingForAd(false);
          try {
            await startMining(userId);
          } catch (err) {
            console.error("Fallback mining failed:", err);
          }
        }
      }, 5000);
    } else {
      // web fallback
      setTimeout(async () => {
        setWaitingForAd(false);
        try {
          await startMining(userId);
        } catch (err) {
          console.error("Web mining failed:", err);
        }
      }, 1000);
    }
  };

  /* ===============================
     REWARDED AD COMPLETE EVENT
  ================================ */
  useEffect(() => {
    const onAdComplete = async () => {
      setWaitingForAd(false);
      try {
        await startMining(userId);
      } catch (err) {
        console.error("Mining API failed:", err);
      }
    };

    window.addEventListener("rewardedAdComplete", onAdComplete);
    return () => window.removeEventListener("rewardedAdComplete", onAdComplete);
  }, [userId]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
  };

  /* ===============================
     UI (Old Dashboard Design Intact)
  ================================ */
  return (
    <div className="mining-dashboard">
      <h2>Pall Mining ⛏️</h2>
      <p>Balance: {uiBalance.toFixed(8)} PALL</p>

      <button
        disabled={mining || waitingForAd || !canStartMining}
        onClick={handleStartMining}
      >
        {waitingForAd
          ? "📺 Showing Ad..."
          : mining
          ? `Mining ⛏ (${formatTime(timeRemaining)})`
          : "Start Mining ⛏"}
      </button>
    </div>
  );
}