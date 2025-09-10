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
  const [miningSpeed, setMiningSpeed] = useState(1);
  const [baseMiningRate, setBaseMiningRate] = useState(1 / (24 * 60 * 60)); // Exactly 1 token per 24 hours
  const [currentPackage, setCurrentPackage] = useState("Free");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canStartMining, setCanStartMining] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load settings first and force correct mining rate
        const correctRate = 1 / (24 * 60 * 60); // Exactly 1 PALL per 24 hours
        setBaseMiningRate(correctRate);
        
        // Update Firestore settings to ensure correct rate is stored
        try {
          await setDoc(doc(db, "settings", "config"), {
            mining: { baseRate: correctRate }
          }, { merge: true });
        } catch (error) {
          console.log("Settings update:", error);
        }

        // Load wallet data
        const snap = await getDoc(doc(db, "wallets", userId));
        if (snap.exists()) {
          const data = snap.data();
          setBalance(data.pallBalance || 0);
          setLastStart(data.lastStart ? data.lastStart.toDate() : null);
          setMining(data.miningActive || false);
          setMiningSpeed(data.miningSpeed || 1);
          setCurrentPackage(data.currentPackage || "Free");
          
          // Check if 24 hours have passed since last mining session
          if (data.lastStart) {
            const lastStartTime = data.lastStart.toDate();
            const now = new Date();
            const timeDiff = now.getTime() - lastStartTime.getTime();
            const hoursElapsed = timeDiff / (1000 * 60 * 60);
            
            if (hoursElapsed >= 24) {
              // Auto-stop mining after 24 hours
              if (data.miningActive) {
                await setDoc(doc(db, "wallets", userId), {
                  miningActive: false
                }, { merge: true });
                setMining(false);
              }
              setCanStartMining(true);
              setTimeRemaining(0);
            } else if (data.miningActive) {
              // Mining is still active within 24 hours
              const remaining = 24 - hoursElapsed;
              setTimeRemaining(remaining * 60 * 60); // Convert to seconds
              setCanStartMining(false);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching mining data:", error);
      }
    };
    fetchData();
  }, [userId]);

  // Mining timer and auto-balance update
  useEffect(() => {
    let miningInterval: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;
    
    if (mining) {
      // Update balance every second
      miningInterval = setInterval(async () => {
        setBalance(prev => {
          const actualRate = baseMiningRate * miningSpeed;
          const newBalance = prev + actualRate;
          saveBalance(newBalance);
          return newBalance;
        });
      }, 1000);
      
      // Update countdown timer
      timerInterval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - stop mining
            setMining(false);
            setCanStartMining(true);
            stopMining();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      clearInterval(miningInterval);
      clearInterval(timerInterval);
    };
  }, [mining, baseMiningRate, miningSpeed]);

  const saveBalance = async (newBalance: number) => {
    try {
      await setDoc(doc(db, "wallets", userId), {
        pallBalance: newBalance,
        miningActive: mining,
        lastStart: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving mining data:", error);
    }
  };

  const startMining = async () => {
    if (!canStartMining) return;
    
    setMining(true);
    setCanStartMining(false);
    const now = new Date();
    setLastStart(now);
    setTimeRemaining(24 * 60 * 60); // 24 hours in seconds
    
    try {
      await setDoc(doc(db, "wallets", userId), {
        pallBalance: balance,
        miningActive: true,
        lastStart: now
      }, { merge: true });
    } catch (error) {
      console.error("Error starting mining:", error);
    }
  };

  const stopMining = async () => {
    setMining(false);
    try {
      await setDoc(doc(db, "wallets", userId), {
        pallBalance: balance,
        miningActive: false
      }, { merge: true });
    } catch (error) {
      console.error("Error stopping mining:", error);
    }
  };

  // Helper function to format time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for circular timer
  const progressPercentage = timeRemaining > 0 ? ((24 * 60 * 60 - timeRemaining) / (24 * 60 * 60)) * 100 : 0;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center text-blue-600">Pall Mining</h2>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        {/* Balance Display */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-2xl font-bold text-blue-600">{balance.toFixed(8)} PALL</p>
        </div>

        {/* Pi Network Style Circular Mining Interface */}
        <div className="relative w-48 h-48 mx-auto">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border-8 border-gray-200 dark:border-gray-700"></div>
          
          {/* Progress Ring */}
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
          
          {/* Center Content */}
          <div className="absolute inset-4 bg-white dark:bg-card rounded-full flex flex-col items-center justify-center shadow-lg border-2 border-blue-100">
            {mining ? (
              <>
                <div className="text-3xl mb-2">⛏️</div>
                <p className="text-sm font-semibold text-green-600">Mining Active</p>
                <p className="text-xs text-muted-foreground">{miningSpeed}X Speed</p>
                <p className="text-xs font-mono text-blue-600 mt-1">
                  {formatTime(Math.floor(timeRemaining))}
                </p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">💎</div>
                <p className="text-sm font-semibold text-gray-600">Ready to Mine</p>
                <p className="text-xs text-muted-foreground">{currentPackage} Package</p>
              </>
            )}
          </div>
        </div>

        {/* Mining Button */}
        {mining ? (
          <div className="space-y-2">
            <Button 
              onClick={stopMining} 
              className="w-full bg-red-500 hover:bg-red-600 text-white"
              data-testid="button-stop-mining"
            >
              ⛔ Stop Mining
            </Button>
            <p className="text-xs text-green-600">
              Earning {(baseMiningRate * miningSpeed).toFixed(8)} PALL/second
            </p>
          </div>
        ) : (
          <Button 
            onClick={startMining} 
            disabled={!canStartMining}
            className={`w-full text-white ${canStartMining ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
            data-testid="button-start-mining"
          >
            {canStartMining ? '⛏️ Start Mining (24h)' : '⏳ Mining Cooldown'}
          </Button>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <p className="text-muted-foreground">Package</p>
            <p className="font-bold text-blue-600">{currentPackage}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
            <p className="text-muted-foreground">Speed</p>
            <p className="font-bold text-purple-600">{miningSpeed}X</p>
          </div>
        </div>

        {!canStartMining && !mining && (
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              ⏰ Next mining session available after 24 hours
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}