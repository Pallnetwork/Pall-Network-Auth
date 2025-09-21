import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface MiningDashboardProps {
  userId: string;
}

export default function MiningDashboard({ userId }: MiningDashboardProps) {
  const [balance, setBalance] = useState(0);
  const [mining, setMining] = useState(false);
  const [lastStart, setLastStart] = useState<Date | null>(null);
  const [baseMiningRate] = useState(0.00001157); // Exactly 1 PALL / 24h
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canStartMining, setCanStartMining] = useState(true);

  // ✅ Expose function for Android App
  useEffect(() => {
    // @ts-ignore
    window.startMiningFromApp = () => {
      startMining();
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDoc(doc(db, "wallets", userId));
        if (snap.exists()) {
          const data = snap.data();
          setBalance(data.pallBalance || 0);

          if (data.lastStart && data.miningActive) {
            const lastStartTime = data.lastStart.toDate();
            const now = new Date();
            const secondsElapsed = Math.floor(
              (now.getTime() - lastStartTime.getTime()) / 1000
            );
            const maxMiningSeconds = 24 * 60 * 60;

            if (secondsElapsed >= maxMiningSeconds) {
              const finalEarnings = maxMiningSeconds * baseMiningRate;
              const finalBalance = (data.pallBalance || 0) + finalEarnings;

              await setDoc(
                doc(db, "wallets", userId),
                {
                  pallBalance: finalBalance,
                  miningActive: false,
                  miningStopTime: now,
                },
                { merge: true }
              );

              setBalance(finalBalance);
              setMining(false);
              setCanStartMining(true);
              setTimeRemaining(0);
              setLastStart(null);
            } else {
              const accruedEarnings = secondsElapsed * baseMiningRate;
              const newBalance = (data.pallBalance || 0) + accruedEarnings;

              if (accruedEarnings > 0) {
                await setDoc(
                  doc(db, "wallets", userId),
                  { pallBalance: newBalance },
                  { merge: true }
                );
                setBalance(newBalance);
              } else {
                setBalance(data.pallBalance || 0);
              }

              setMining(true);
              setCanStartMining(false);
              setLastStart(lastStartTime);
              setTimeRemaining(maxMiningSeconds - secondsElapsed);
            }
          } else {
            setMining(false);
            setCanStartMining(true);
            setTimeRemaining(0);
            setLastStart(null);
          }
        } else {
          await setDoc(doc(db, "wallets", userId), {
            pallBalance: 0,
            miningActive: false,
          });
        }
      } catch (error) {
        console.error("Error fetching mining data:", error);
      }
    };
    fetchData();
  }, [userId]);

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
        try {
          await setDoc(
            doc(db, "wallets", userId),
            { pallBalance: localBalance },
            { merge: true }
          );
        } catch (error) {
          console.error("Error saving balance:", error);
        }
      }, 10000);

      timerInterval = setInterval(async () => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (miningInterval) clearInterval(miningInterval);
            if (saveInterval) clearInterval(saveInterval);
            if (timerInterval) clearInterval(timerInterval);

            setMining(false);
            setCanStartMining(true);
            setLastStart(null);
            setBalance(localBalance);

            (async () => {
              try {
                await setDoc(
                  doc(db, "wallets", userId),
                  {
                    pallBalance: localBalance,
                    miningActive: false,
                    miningStopTime: new Date(),
                  },
                  { merge: true }
                );
              } catch (error) {
                console.error("Error stopping mining:", error);
              }
            })();

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (miningInterval) clearInterval(miningInterval);
      if (timerInterval) clearInterval(timerInterval);
      if (saveInterval) clearInterval(saveInterval);
    };
  }, [mining, lastStart, baseMiningRate, userId]);

  const startMining = async () => {
    if (!canStartMining) return;

    try {
      // Show rewarded ad before starting mining
      // ⚠️ Works only in Android build, not Replit preview
      // @ts-ignore
      if (window.AdMob && window.AdMob.rewardVideo) {
        await window.AdMob.rewardVideo.load({
          id: {
            android: "ca-app-pub-3940256099942544/5224354917", // 🔹 Test Rewarded ID
          },
        });

        await window.AdMob.rewardVideo.show();
      }
    } catch (adError) {
      console.error("Rewarded Ad failed:", adError);
    }

    // Continue mining logic after ad
    const now = new Date();
    const miningDurationSeconds = 24 * 60 * 60;

    setMining(true);
    setCanStartMining(false);
    setLastStart(now);
    setTimeRemaining(miningDurationSeconds);

    try {
      await setDoc(
        doc(db, "wallets", userId),
        {
          pallBalance: balance,
          miningActive: true,
          lastStart: now,
          miningStartTime: now,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error starting mining:", error);
      setMining(false);
      setCanStartMining(true);
      setLastStart(null);
      setTimeRemaining(0);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage =
    timeRemaining > 0
      ? ((24 * 60 * 60 - timeRemaining) / (24 * 60 * 60)) * 100
      : 0;

  return (
    <Card className="max-w-md mx-auto rounded-2xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
      <CardHeader className="pb-4">
        <h2 className="text-3xl font-bold text-center text-blue-600">
          Pall Mining ⛏️
        </h2>
      </CardHeader>
      <CardContent className="text-center space-y-6 px-6 pb-8">
        {/* Balance Display */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Current Balance
          </p>
          <p className="text-3xl font-bold text-blue-600">
            {balance.toFixed(8)} PALL
          </p>
        </div>

        {/* Mining UI */}
        <div className="relative w-48 h-48 mx-auto">
          <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>

          {mining && timeRemaining > 0 && (
            <svg
              className="absolute inset-0 w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
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
                <p className="text-base font-bold text-green-600">
                  Mining Active
                </p>
                <p className="text-base font-bold text-muted-foreground">
                  Standard Rate
                </p>
                <p className="text-base font-mono font-bold text-blue-600 mt-1">
                  {formatTime(Math.floor(timeRemaining))}
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">💎</div>
                <p className="text-sm font-semibold text-gray-600">
                  Ready to Mine
                </p>
                <p className="text-xs text-muted-foreground">Standard Mining</p>
              </>
            )}
          </div>
        </div>

        {/* Mining Button */}
        <Button
          onClick={mining ? undefined : startMining}
          disabled={mining || !canStartMining}
          className={`w-full py-4 text-lg font-bold rounded-xl text-white hover:scale-105 transition-all duration-200 
            ${
              mining
                ? "bg-orange-500 cursor-default shadow-lg"
                : canStartMining
                ? "bg-green-500 hover:bg-green-600 shadow-lg"
                : "bg-gray-400 cursor-not-allowed"
            } 
            overflow-hidden whitespace-nowrap text-ellipsis text-center`}
          data-testid={mining ? "button-mining-active" : "button-start-mining"}
        >
          {mining
            ? `Mining in Progress ⛏ (${formatTime(
                Math.floor(timeRemaining)
              )})`
            : canStartMining
            ? "Start Mining ⛏"
            : "⏳ Ready for Next Session"}
        </Button>
      </CardContent>
    </Card>
  );
}
