import React, { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface MiningDashboardProps {
  userId: string;
}

const DAY_SECONDS = 24 * 60 * 60;
const BASE_RATE = 1 / DAY_SECONDS; // ✅ Exactly 1 PALL / 24h

export default function MiningDashboard({ userId }: MiningDashboardProps) {
  const [balance, setBalance] = useState(0);
  const [mining, setMining] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const lastStartRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const saveRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // 🔹 INITIAL LOAD + AUTO RESUME
  useEffect(() => {
    const loadWallet = async () => {
      const snap = await getDoc(doc(db, "wallets", userId));
      if (!snap.exists()) return;

      const data = snap.data();
      setBalance(data.pallBalance || 0);

      if (data.miningActive && data.lastStart) {
        const start = data.lastStart.toDate();
        const elapsed = Math.floor(
          (Date.now() - start.getTime()) / 1000
        );

        if (elapsed >= DAY_SECONDS) {
          // ⛔ Mining completed while app closed
          await setDoc(
            doc(db, "wallets", userId),
            {
              miningActive: false,
              miningStopTime: new Date(),
            },
            { merge: true }
          );
          setMining(false);
          setTimeRemaining(0);
        } else {
          // ▶ Resume mining
          lastStartRef.current = start;
          setMining(true);
          setTimeRemaining(DAY_SECONDS - elapsed);
        }
      }
    };

    loadWallet();
  }, [userId]);

  // 🔹 MINING LOOP (SINGLE INTERVAL GUARANTEE)
  useEffect(() => {
    if (!mining) return;

    intervalRef.current = setInterval(() => {
      setBalance((b) => b + BASE_RATE);
      setTimeRemaining((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    saveRef.current = setInterval(async () => {
      await setDoc(
        doc(db, "wallets", userId),
        { pallBalance: balance },
        { merge: true }
      );
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (saveRef.current) clearInterval(saveRef.current);
    };
  }, [mining, balance, userId]);

  // 🔹 STOP AT 24 HOURS (HARD CAP)
  useEffect(() => {
    if (mining && timeRemaining === 0) {
      stopMining();
    }
  }, [timeRemaining, mining]);

  const startMining = async () => {
    if (mining) return;

    const now = new Date();
    lastStartRef.current = now;
    setMining(true);
    setTimeRemaining(DAY_SECONDS);

    await setDoc(
      doc(db, "wallets", userId),
      {
        miningActive: true,
        lastStart: now,
      },
      { merge: true }
    );

    toast({
      title: "Mining Started ⛏️",
      description: "Mining session started for 24 hours.",
    });
  };

  const stopMining = async () => {
    setMining(false);

    await setDoc(
      doc(db, "wallets", userId),
      {
        pallBalance: balance,
        miningActive: false,
        miningStopTime: new Date(),
      },
      { merge: true }
    );

    toast({
      title: "Mining Completed ✅",
      description: "24 hours mining completed.",
    });
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 3600)
      .toString()
      .padStart(2, "0")}:${Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">PALL Mining ⛏️</h2>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-3xl font-bold">{balance.toFixed(8)} PALL</p>
        </div>

        {mining && (
          <p className="font-mono text-lg text-blue-600">
            {formatTime(timeRemaining)}
          </p>
        )}

        <Button
          onClick={startMining}
          disabled={mining}
          className="w-full py-4 text-lg"
        >
          {mining ? "Mining Active ⛏️" : "Start Mining"}
        </Button>
      </CardContent>
    </Card>
  );
}
