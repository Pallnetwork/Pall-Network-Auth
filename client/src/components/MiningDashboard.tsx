import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

declare global {
  interface Window {
    Android?: {
      showRewardedAd: () => void;
    };
  }
}

export default function MiningDashboard({ userId }: { userId: string }) {
  const [balance, setBalance] = useState(0);
  const [mining, setMining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const miningStartedRef = useRef(false);

  // ---------------- Wallet ----------------
  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "wallets", userId));
      if (snap.exists()) {
        const d = snap.data();
        setBalance(d.pallBalance || 0);
        setMining(d.miningActive || false);
      }
    };
    load();
  }, [userId]);

  // ---------------- Rewarded complete ----------------
  useEffect(() => {
    const onRewarded = async () => {
      if (miningStartedRef.current) return;
      miningStartedRef.current = true;

      const now = new Date();
      await setDoc(
        doc(db, "wallets", userId),
        {
          miningActive: true,
          lastStart: now,
          miningStartTime: now,
        },
        { merge: true }
      );

      setMining(true);
      setTimeLeft(86400);
    };

    window.addEventListener("rewardedAdComplete", onRewarded);
    return () =>
      window.removeEventListener("rewardedAdComplete", onRewarded);
  }, [userId]);

  // ---------------- Timer ----------------
  useEffect(() => {
    if (!mining) return;

    const t = setInterval(() => {
      setTimeLeft((p) => (p > 0 ? p - 1 : 0));
    }, 1000);

    return () => clearInterval(t);
  }, [mining]);

  // ---------------- Start ----------------
  const startMining = () => {
    miningStartedRef.current = false;
    window.Android?.showRewardedAd();
  };

  const format = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(
      Math.floor((s % 3600) / 60)
    ).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">Pall Mining ⛏️</h2>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-xl font-bold">{balance.toFixed(8)} PALL</p>

        {mining ? (
          <p className="font-mono text-lg">⛏ Mining {format(timeLeft)}</p>
        ) : (
          <Button onClick={startMining} className="w-full">
            Start Mining ⛏ (Watch Ad)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
