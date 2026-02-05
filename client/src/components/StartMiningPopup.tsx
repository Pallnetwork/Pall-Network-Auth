import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";

interface StartMiningPopupProps {
  uid: string;
  onClose: () => void;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function StartMiningPopup({ uid, onClose }: StartMiningPopupProps) {
  const { toast } = useToast();
  const [miningActive, setMiningActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(ONE_DAY_MS);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ======================
  // Sync Mining state from Firestore on popup open
  // ======================
  useEffect(() => {
    if (!uid) return;

    const fetchMiningState = async () => {
      try {
        const walletRef = doc(db, "wallets", uid);
        const snap = await getDoc(walletRef);
        if (!snap.exists()) return;

        const wallet = snap.data();
        const lastStart = wallet.lastStart?.toDate?.() || null;
        const active = wallet.miningActive ?? false;

        if (active && lastStart) {
          const now = Date.now();
          const elapsed = now - lastStart.getTime();
          const remaining = Math.max(ONE_DAY_MS - elapsed, 0);

          setMiningActive(true);
          setTimeRemaining(remaining);
        }
      } catch (err: any) {
        console.error("Failed to fetch mining state:", err);
      }
    };

    fetchMiningState();
  }, [uid]);

  // ======================
  // Timer logic
  // ======================
  useEffect(() => {
    if (!miningActive) return;

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(intervalRef.current!);
          finishMining();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [miningActive]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const styleNumber = (n: number) => (
      <span style={{ fontWeight:"bold", textShadow:"1px 1px 2px rgba(0,0,0,0.3)" }}>
        {n.toString().padStart(2,"0")}
      </span>
    );
    return <>{styleNumber(h)}:{styleNumber(m)}:{styleNumber(s)}</>;
  };

  // ======================
  // Finish Mining (Atomic Increment)
  // ======================
  const finishMining = async () => {
    try {
      const walletRef = doc(db, "wallets", uid);

      await updateDoc(walletRef, {
        miningActive: false,
        lastStart: null,
        pallBalance: increment(0.5),
        totalEarnings: increment(0.5),
        lastMinedAt: serverTimestamp(),
      });

      setMiningActive(false);
      setTimeRemaining(ONE_DAY_MS);

      toast({
        title: "⛏ Mining Completed",
        description: "24h mining done! 0.5 PALL added to your wallet",
      });
    } catch (err: any) {
      console.error("Error finishing mining:", err);
      toast({
        title: "Error",
        description: "Failed to complete mining",
        variant: "destructive",
      });
    }
  };

  // ======================
  // Start Normal Mining
  // ======================
  const handleNormalMining = async () => {
    if (miningActive) {
      toast({ title: "Mining already active", description: "Wait for 24h", variant: "destructive" });
      return;
    }

    try {
      const walletRef = doc(db, "wallets", uid);
      const nowTs = new Date();

      await updateDoc(walletRef, {
        miningActive: true,
        lastStart: nowTs,
      });

      setMiningActive(true);
      setTimeRemaining(ONE_DAY_MS);

      toast({
        title: "Mining Started",
        description: "Normal 24h mining started!",
      });

      onClose();
    } catch (err: any) {
      console.error("Error starting mining:", err);
      toast({
        title: "Error",
        description: "Failed to start mining",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <Card className="max-w-md w-full rounded-2xl shadow-lg border-0 bg-white dark:bg-gray-800 p-6">
        <CardContent className="space-y-6 text-center">
          <h2 className="text-xl font-bold text-blue-600">Start Mining ⛏</h2>

          <div className="relative w-48 h-48 mx-auto">
            <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>
            {miningActive && (
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none"
                  className="text-blue-500"
                  strokeDasharray="264"
                  strokeDashoffset={264 - ((ONE_DAY_MS - timeRemaining)/ONE_DAY_MS)*264}
                  strokeLinecap="round"
                />
              </svg>
            )}
            <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-blue-100 dark:border-blue-800">
              <p className="text-2xl font-mono font-bold text-blue-600">{formatTime(timeRemaining)}</p>
            </div>
          </div>

          <Button
            disabled={miningActive}
            onClick={handleNormalMining}
            className="w-full py-4 text-lg font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-lg"
          >
            {miningActive ? "Mining Active ⛏" : "Normal Mining ⛏"}
          </Button>

          <Button variant="outline" className="w-full py-2 mt-2" onClick={onClose}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
