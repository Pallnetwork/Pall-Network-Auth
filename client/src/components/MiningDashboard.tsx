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
  const baseMiningRate = 0.01; // Base rate: 0.01 PALL per second

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDoc(doc(db, "wallets", userId));
        if (snap.exists()) {
          const data = snap.data();
          setBalance(data.pallBalance || 0);
          setLastStart(data.lastStart ? data.lastStart.toDate() : null);
          setMining(data.miningActive || false);
          setMiningSpeed(data.miningSpeed || 1);
        }
      } catch (error) {
        console.error("Error fetching mining data:", error);
      }
    };
    fetchData();
  }, [userId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mining) {
      interval = setInterval(async () => {
        setBalance(prev => {
          const actualRate = baseMiningRate * miningSpeed;
          const newBalance = prev + actualRate;
          saveBalance(newBalance);
          return newBalance;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mining]);

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
    setMining(true);
    setLastStart(new Date());
    try {
      await setDoc(doc(db, "wallets", userId), {
        pallBalance: balance,
        miningActive: true,
        lastStart: new Date()
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

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">Pall Mining ⛏</h2>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-lg">
          Current Balance: <b>{balance.toFixed(4)} PALL</b>
        </p>
        
        {mining && (
          <div className="text-sm text-green-600">
            <p>⚡ Mining Active - Earning {(baseMiningRate * miningSpeed).toFixed(3)} PALL/second</p>
            <p className="text-xs">Speed Multiplier: {miningSpeed}X</p>
            {lastStart && (
              <p>Started: {lastStart.toLocaleTimeString()}</p>
            )}
          </div>
        )}

        {mining ? (
          <Button 
            onClick={stopMining} 
            className="bg-red-500 hover:bg-red-600 text-white"
            data-testid="button-stop-mining"
          >
            Stop Mining
          </Button>
        ) : (
          <Button 
            onClick={startMining} 
            className="bg-green-500 hover:bg-green-600 text-white"
            data-testid="button-start-mining"
          >
            Start Mining
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          Base Rate: {baseMiningRate} PALL/sec × {miningSpeed}X = {(baseMiningRate * miningSpeed).toFixed(3)} PALL/sec
        </p>
      </CardContent>
    </Card>
  );
}