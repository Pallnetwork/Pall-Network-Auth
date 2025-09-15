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
  const [baseMiningRate] = useState(0.00001157); // Exactly 0.00001157 PALL/second = 1 PALL per 24 hours
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canStartMining, setCanStartMining] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load wallet data from Firestore
        const snap = await getDoc(doc(db, "wallets", userId));
        if (snap.exists()) {
          const data = snap.data();
          setBalance(data.pallBalance || 0);
          
          // Check mining state and timing
          if (data.lastStart && data.miningActive) {
            const lastStartTime = data.lastStart.toDate();
            const now = new Date();
            const secondsElapsed = Math.floor((now.getTime() - lastStartTime.getTime()) / 1000);
            const maxMiningSeconds = 24 * 60 * 60; // 24 hours in seconds
            
            if (secondsElapsed >= maxMiningSeconds) {
              // 24 hours completed - auto-stop mining
              await setDoc(doc(db, "wallets", userId), {
                miningActive: false,
                miningStopTime: now
              }, { merge: true });
              setMining(false);
              setCanStartMining(true);
              setTimeRemaining(0);
              setLastStart(null);
            } else {
              // Mining still active within 24 hours
              setMining(true);
              setCanStartMining(false);
              setLastStart(lastStartTime);
              setTimeRemaining(maxMiningSeconds - secondsElapsed);
            }
          } else {
            // No active mining session
            setMining(false);
            setCanStartMining(true);
            setTimeRemaining(0);
            setLastStart(null);
          }
        } else {
          // Create new wallet document if doesn't exist
          await setDoc(doc(db, "wallets", userId), {
            pallBalance: 0,
            miningActive: false
          });
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
    
    if (mining && lastStart) {
      // Update balance every second
      miningInterval = setInterval(async () => {
        const newBalance = balance + baseMiningRate;
        setBalance(newBalance);
        
        // Save to Firestore every 10 seconds to reduce API calls
        const now = new Date();
        if (Math.floor(now.getSeconds()) % 10 === 0) {
          try {
            await setDoc(doc(db, "wallets", userId), {
              pallBalance: newBalance
            }, { merge: true });
          } catch (error) {
            console.error("Error saving balance:", error);
          }
        }
      }, 1000);
      
      // Update countdown timer and check for auto-stop
      timerInterval = setInterval(async () => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // 24 hours completed - auto-stop mining
            setMining(false);
            setCanStartMining(true);
            setLastStart(null);
            
            // Final balance save and stop mining in Firestore
            const finalBalance = balance + baseMiningRate;
            setBalance(finalBalance);
            
            (async () => {
              try {
                await setDoc(doc(db, "wallets", userId), {
                  pallBalance: finalBalance,
                  miningActive: false,
                  miningStopTime: new Date()
                }, { merge: true });
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
    };
  }, [mining, lastStart, balance, baseMiningRate, userId]);

  const startMining = async () => {
    if (!canStartMining) return;
    
    const now = new Date();
    const miningDurationSeconds = 24 * 60 * 60; // Exactly 24 hours
    
    // Update local state
    setMining(true);
    setCanStartMining(false);
    setLastStart(now);
    setTimeRemaining(miningDurationSeconds);
    
    try {
      // Save mining start to Firestore
      await setDoc(doc(db, "wallets", userId), {
        pallBalance: balance,
        miningActive: true,
        lastStart: now,
        miningStartTime: now
      }, { merge: true });
    } catch (error) {
      console.error("Error starting mining:", error);
      // Reset state on error
      setMining(false);
      setCanStartMining(true);
      setLastStart(null);
      setTimeRemaining(0);
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
                <p className="text-xs text-muted-foreground">Standard Rate</p>
                <p className="text-xs font-mono text-blue-600 mt-1">
                  {formatTime(Math.floor(timeRemaining))}
                </p>
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
        {mining ? (
          <div className="space-y-2">
            <div className="w-full p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                🔥 Mining in Progress
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                Earning {baseMiningRate.toFixed(8)} PALL/second
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Mining will auto-stop after 24 hours
              </p>
            </div>
          </div>
        ) : (
          <Button 
            onClick={startMining} 
            disabled={!canStartMining}
            className={`w-full text-white ${canStartMining ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
            data-testid="button-start-mining"
          >
            {canStartMining ? '⛏️ Start Mining' : '⏳ Mining Completed - Ready for Next Session'}
          </Button>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-center">
            <p className="text-muted-foreground">Mining Rate</p>
            <p className="font-bold text-blue-600">1 PALL / 24 hours</p>
          </div>
        </div>

        {!canStartMining && !mining && (
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              ✅ Mining session completed! Click "Start Mining" to begin next 24-hour cycle
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}