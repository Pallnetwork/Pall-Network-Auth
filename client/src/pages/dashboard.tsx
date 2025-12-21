// 🔧 FIXED DASHBOARD – SAFE MINING SYNC VERSION
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut,
  Menu,
  X,
  Home,
  User,
  Users,
  Info,
  Wallet,
  Shield,
  Zap
} from "lucide-react";
import MiningDashboard from "@/components/MiningDashboard";
import UpgradePage from "@/components/UpgradePage";
import PoliciesPage from "@/components/PoliciesPage";

/* ---------- types unchanged ---------- */
interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  createdAt: any;
  referralCode?: string;
}

interface Profile {
  userId: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone: string;
  address: string;
  createdAt: any;
}

/* ---------- auth expiry helpers (unchanged) ---------- */
const AUTH_EXPIRY_MS = 24 * 60 * 60 * 1000;
const AUTH_TIMESTAMP_KEY = "authTimestamp";

const setAuthTimestampNow = () =>
  localStorage.setItem(AUTH_TIMESTAMP_KEY, String(Date.now()));
const clearAuthTimestamp = () =>
  localStorage.removeItem(AUTH_TIMESTAMP_KEY);

const isAuthExpired = () => {
  const ts = Number(localStorage.getItem(AUTH_TIMESTAMP_KEY));
  if (!ts) return false;
  return Date.now() - ts > AUTH_EXPIRY_MS;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pallBalance, setPallBalance] = useState(0);
  const [miningStatus, setMiningStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [path, navigate] = useLocation();
  const { toast } = useToast();

  /* ---------- PAGE DETECTION ---------- */
  const currentPage =
    path === "/app/dashboard/profile"
      ? "PROFILE"
      : path === "/app/dashboard/referral"
      ? "REFERRAL"
      : path === "/app/dashboard/wallet"
      ? "WALLET"
      : path === "/app/dashboard/upgrade"
      ? "UPGRADE"
      : path === "/app/dashboard/policies"
      ? "ABOUT"
      : "HOME";

  /* =====================================================
     🔐 AUTH + DATA LOAD (SINGLE SOURCE OF TRUTH)
     ===================================================== */
  useEffect(() => {
    let walletUnsub: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearAuthTimestamp();
        navigate("/app/signin");
        return;
      }

      const uid = firebaseUser.uid;
      localStorage.setItem("userId", uid);
      setAuthTimestampNow();

      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) throw new Error("User doc missing");
        setUser({ id: uid, ...(userSnap.data() as any) });

        const profileSnap = await getDoc(doc(db, "profiles", uid));
        if (profileSnap.exists()) setProfile(profileSnap.data() as Profile);

        /* 🔥 REALTIME WALLET LISTENER (NO POLLING) */
        walletUnsub = onSnapshot(doc(db, "wallets", uid), (snap) => {
          if (!snap.exists()) return;
          const w = snap.data();
          setPallBalance(w.pallBalance || 0);
          setMiningStatus(!!w.miningActive);
        });

      } catch (e) {
        console.error(e);
        await signOut(auth);
        navigate("/app/signin");
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (walletUnsub) walletUnsub();
    };
  }, [navigate]);

  /* ---------- AUTH EXPIRY CHECK ---------- */
  useEffect(() => {
    const interval = setInterval(async () => {
      if (auth.currentUser && isAuthExpired()) {
        await signOut(auth);
        clearAuthTimestamp();
        navigate("/app/signin");
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  /* =====================================================
     🧩 UI
     ===================================================== */
  return (
    <div className="min-h-screen bg-background">
      {/* TOP BAR */}
      <div className="flex justify-between items-center bg-green-600 text-white p-4">
        <h1 className="text-xl font-bold">Pall Network</h1>
        <Button variant="ghost" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu />
        </Button>
      </div>

      {/* MAIN */}
      <div className="p-6 max-w-4xl mx-auto">
        {currentPage === "HOME" && (
          <>
            <MiningDashboard userId={user.id} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xl font-bold">{pallBalance.toFixed(4)}</p>
                  <p className="text-sm text-muted-foreground">PALL</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p
                    className={`text-xl font-bold ${
                      miningStatus ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {miningStatus ? "Active" : "Idle"}
                  </p>
                  <p className="text-sm text-muted-foreground">Mining</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {currentPage === "UPGRADE" && <UpgradePage userId={user.id} />}
        {currentPage === "ABOUT" && (
          <PoliciesPage onBack={() => navigate("/app/dashboard")} />
        )}
      </div>
    </div>
  );
}
