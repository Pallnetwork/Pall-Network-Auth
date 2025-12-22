import { useEffect, useState, useRef } from "react";
import { Button, Card, CardContent, CardHeader } from "@/components/ui/card";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useLocation } from "wouter";
import axios from "axios";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function MiningPage() {
  const [, navigate] = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [miningProgress, setMiningProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timer | null>(null);

  // ===============================
  // ✅ AUTH CHECK
  // ===============================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/app/signin");
      } else {
        setUserId(user.uid);
        fetchWallet(user.uid);
      }
    });
    return () => unsub();
  }, [navigate]);

  // ===============================
  // ✅ FETCH WALLET
  // ===============================
  const fetchWallet = async (uid: string) => {
    const ref = doc(db, "wallets", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) setWallet(snap.data());
  };

  // ===============================
  // ✅ START MINING (AFTER AD)
  // ===============================
  const startMining = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const resp = await axios.post("/api/mining/start", { userId });
      if (resp.data.success) {
        await fetchWallet(userId);
        startTimer();
      }
    } catch {
      alert("Failed to start mining");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // ✅ LISTEN AD COMPLETE EVENT
  // ===============================
  useEffect(() => {
    const onRewarded = () => {
      startMining();
    };

    window.addEventListener("rewardedAdComplete", onRewarded);
    return () => {
      window.removeEventListener("rewardedAdComplete", onRewarded);
    };
  }, [userId]);

  // ===============================
  // ⏱️ TIMER
  // ===============================
  const startTimer = () => {
    if (!wallet?.lastStart) return;

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

  // ===============================
  // 🎁 CLAIM REWARD
  // ===============================
  const claimReward = async () => {
    if (!userId || miningProgress < 100) return;

    let reward = 1;
    if (wallet?.bonusActive) reward *= 2;
    if (wallet?.referredBy) reward += 0.5;

    const ref = doc(db, "wallets", userId);
    await updateDoc(ref, {
      pallBalance: increment(reward),
      totalEarnings: increment(reward),
      miningActive: false,
      lastStart: null,
      bonusActive: false,
    });

    alert(`🎉 You received ${reward} PALL`);
    fetchWallet(userId);
    setMiningProgress(0);
  };

  // ===============================
  // UI
  // ===============================
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold">Mining Dashboard</h2>
        </CardHeader>

        <CardContent className="space-y-4">
          <p><strong>Balance:</strong> {wallet?.pallBalance || 0} PALL</p>
          <p><strong>Mining Active:</strong> {wallet?.miningActive ? "Yes" : "No"}</p>

          {!wallet?.miningActive && (
            <Button
              disabled={loading}
              onClick={() => {
                if ((window as any).Android) {
                  (window as any).Android.showRewardedAd();
                } else {
                  alert("Rewarded Ad not available");
                }
              }}
            >
              Start Mining
            </Button>
          )}

          {wallet?.miningActive && (
            <>
              <p>Progress: {miningProgress.toFixed(2)}%</p>
              <progress value={miningProgress} max={100} className="w-full" />
            </>
          )}

          <Button
            onClick={claimReward}
            disabled={miningProgress < 100}
          >
            Claim Reward
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
