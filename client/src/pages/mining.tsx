import { useEffect, useState, useRef } from "react";
import { Button, Card, CardContent, CardHeader } from "@/components/ui/card";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation } from "wouter";
import axios from "axios";

// AdMob import (example for React Native Web/Expo)
// import { RewardedAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function MiningPage() {
  const [, navigate] = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [miningProgress, setMiningProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timer | null>(null);

  // ✅ Load logged in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/app/signin");
      } else {
        setUserId(user.uid);
        fetchWallet(user.uid);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // ✅ Fetch wallet
  const fetchWallet = async (uid: string) => {
    try {
      const walletRef = doc(db, "wallets", uid);
      const snap = await getDoc(walletRef);
      if (snap.exists()) {
        setWallet(snap.data());
      }
    } catch (err) {
      console.error("Fetch wallet error:", err);
    }
  };

  // ✅ Watch Rewarded Ad
  const watchAd = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      // Here integrate real AdMob RewardedAd API
      // Example: ad.show()
      await axios.post("/api/mining/ad-complete", { userId });
      alert("✅ Ad watched! You can start mining now.");
      fetchWallet(userId);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to verify ad");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Start mining (ad required)
  const startMining = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const resp = await axios.post("/api/mining/start", { userId });
      if (resp.data.success) {
        fetchWallet(userId);
        startTimer();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to start mining");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Claim mining reward
  const claimReward = async () => {
    if (!userId || !wallet) return;
    try {
      setLoading(true);

      // Compute reward with bonuses
      let reward = 1; // base reward 1 PALL
      if (wallet.bonusActive) reward *= 2; // 2x speed bonus
      if (wallet.referredBy) reward += 0.5; // referral boost +0.5 PALL

      // Update wallet in Firestore
      const walletRef = doc(db, "wallets", userId);
      await updateDoc(walletRef, {
        pallBalance: increment(reward),
        totalEarnings: increment(reward),
        miningActive: false,
        lastStart: null,
        bonusActive: false, // reset bonus
      });

      alert(`🎉 You received ${reward} PALL token(s)!`);
      fetchWallet(userId);
      setMiningProgress(0);
    } catch (err) {
      console.error("Claim reward error:", err);
      alert("Failed to claim reward");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Timer for mining progress
  const startTimer = () => {
    if (!wallet || !wallet.lastStart) return;
    clearInterval(timerRef.current!);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - wallet.lastStart.toMillis();
      const progress = Math.min((elapsed / ONE_DAY_MS) * 100, 100);
      setMiningProgress(progress);

      if (progress >= 100) clearInterval(timerRef.current!);
    }, 1000);
  };

  useEffect(() => {
    if (wallet?.miningActive) startTimer();
    return () => clearInterval(timerRef.current!);
  }, [wallet]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold">Mining Dashboard</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p>
              <strong>PALL Balance:</strong> {wallet?.pallBalance || 0}
            </p>
            <p>
              <strong>Mining Active:</strong> {wallet?.miningActive ? "Yes" : "No"}
            </p>
            <p>
              <strong>Mining Speed:</strong> {wallet?.miningSpeed || 1}x{" "}
              {wallet?.bonusActive ? "(2x Bonus)" : ""}
            </p>
            <p>
              <strong>Referral Bonus:</strong>{" "}
              {wallet?.referredBy ? "+0.5 PALL" : "None"}
            </p>
          </div>

          {!wallet?.adWatched && (
            <Button onClick={watchAd} disabled={loading}>
              Watch Rewarded Ad to Start Mining
            </Button>
          )}

          {!wallet?.miningActive && wallet?.adWatched && (
            <Button onClick={startMining} disabled={loading}>
              Start Mining
            </Button>
          )}

          {wallet?.miningActive && (
            <div>
              <p>Mining Progress: {miningProgress.toFixed(2)}%</p>
              <progress value={miningProgress} max={100} className="w-full" />
            </div>
          )}

          <Button
            onClick={claimReward}
            disabled={!wallet?.miningActive && miningProgress < 100}
          >
            Claim Reward
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
