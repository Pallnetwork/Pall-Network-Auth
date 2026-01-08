import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, updateDoc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Menu, X, Home, User, Users, CreditCard, Info, Wallet, Shield, Pickaxe, Zap } from "lucide-react";
import MiningDashboard from "@/components/MiningDashboard";
import UpgradePage from "@/components/UpgradePage";
import PoliciesPage from "@/components/PoliciesPage";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  createdAt: any;
  invitation?: string;
  referralCode?: string;
  referredBy?: string;
  package?: string;
  packagePrice?: number;
}

interface Profile {
  userId: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone: string;
  address: string;
  photoURL?: string;
  createdAt: any;
}

// ---- AUTH EXPIRY: 24 HOURS ----
const AUTH_EXPIRY_MS = 24 * 60 * 60 * 1000;
const AUTH_TIMESTAMP_KEY = "authTimestamp";

function setAuthTimestampNow() {
  try {
    localStorage.setItem(AUTH_TIMESTAMP_KEY, String(Date.now()));
  } catch (e) {
    console.warn("Could not set auth timestamp:", e);
  }
}

function clearAuthTimestamp() {
  try {
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
  } catch (e) {
    console.warn("Could not clear auth timestamp:", e);
  }
}

function isAuthExpired(): boolean {
  try {
    const ts = Number(localStorage.getItem(AUTH_TIMESTAMP_KEY));
    if (!ts || Number.isNaN(ts)) return false;
    return Date.now() - ts > AUTH_EXPIRY_MS;
  } catch (e) {
    console.warn("Error checking auth expiry:", e);
    return false;
  }
}

// F2 Referrals Component
function F2Referrals({ userId, onTotalChange }: { userId: string; onTotalChange?: (total: number) => void }) {
  const [f2Referrals, setF2Referrals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchF2Referrals = async () => {
      try {
        const q1 = query(collection(db, "users"), where("referredBy", "==", userId));
        const snap1 = await getDocs(q1);
        let f2List: User[] = [];
        for (let doc1 of snap1.docs) {
          const userF1Id = doc1.id;
          const q2 = query(collection(db, "users"), where("referredBy", "==", userF1Id));
          const snap2 = await getDocs(q2);
          snap2.docs.forEach(doc => {
            const userData = doc.data() as User;
            f2List.push(userData);
          });
        }
        setF2Referrals(f2List);
        const total = f2List.reduce((sum, r) => sum + (0.025 * (r.packagePrice || 100)), 0);
        onTotalChange?.(total);
      } catch (error) {
        console.error("Error fetching F2 referrals:", error);
        onTotalChange?.(0);
      } finally {
        setLoading(false);
      }
    };
    fetchF2Referrals();
  }, [userId, onTotalChange]);

  if (loading) return <p className="text-muted-foreground">Loading indirect referrals...</p>;
  if (f2Referrals.length === 0) return <p className="text-muted-foreground mb-4">No indirect referrals yet.</p>;

  return (
    <div className="space-y-2 mb-4">
      {f2Referrals.map((referral, index) => (
        <div key={index} className="flex justify-between items-center p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div>
            <p className="font-medium">@{referral.username}</p>
            <p className="text-sm text-muted-foreground">
              Joined {new Date(referral.createdAt?.toDate?.() || referral.createdAt).toLocaleDateString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Referred by: @{referral.referredBy}
            </p>
          </div>
          <div className="text-blue-600 font-bold">
            2.5% ({(0.025 * (referral.packagePrice || 100)).toFixed(2)} USDT)
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referrals, setReferrals] = useState<User[]>([]);
  const [f2Total, setF2Total] = useState(0);
  const [referralData, setReferralData] = useState<{ f1Commission: number; f2Commission: number; totalCommission: number; referredUsers: string[] } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pallBalance, setPallBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [miningStatus, setMiningStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", dob: "", gender: "", phone: "", address: "", photoURL: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [path, navigate] = useLocation();
  const { toast } = useToast();
  const [invitationCode, setInvitationCode] = useState("");

  const handleSaveInvitation = async () => {
    const userId = user?.id || localStorage.getItem("userId");
    if (!userId || invitationCode.trim() === "") return;
    try {
      await updateDoc(doc(db, "users", userId), { referredBy: invitationCode.trim().toLowerCase() });
      toast({ title: "Success", description: "Invitation code saved successfully!" });
    } catch (e) {
      console.error("Error saving invitation code:", e);
      toast({ title: "Error", description: "Failed to save invitation code.", variant: "destructive" });
    }
  };

  // SAFE Auth & Data Fetch
  useEffect(() => {
    let redirectTimeout: NodeJS.Timeout;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthInitialized(true);
      if (!firebaseUser) {
        redirectTimeout = setTimeout(() => {
          if (!auth.currentUser) {
            localStorage.removeItem("userId");
            clearAuthTimestamp();
            navigate("/app/signin");
          }
        }, 3000);
        return;
      }

      const userId = firebaseUser.uid;
      try { localStorage.setItem("userId", userId); } catch {}
      setAuthTimestampNow();

      const fetchData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (!userDoc.exists()) {
            await signOut(auth);
            localStorage.removeItem("userId");
            clearAuthTimestamp();
            navigate("/app/signin");
            return;
          }
          setUser(userDoc.data() as User);

          const profileDoc = await getDoc(doc(db, "profiles", userId));
          if (profileDoc.exists()) setProfile(profileDoc.data() as Profile);

          // Wallet & Mining
          try {
            const walletSnap = await getDoc(doc(db, "wallets", userId));
            if (walletSnap.exists()) {
              const walletData = walletSnap.data();
              setPallBalance(walletData?.pallBalance || 0);
              setUsdtBalance(walletData?.usdtBalance || 0);
              setMiningStatus(walletData?.miningActive || false);
            }
          } catch (e) { console.error("Wallet fetch error:", e); }

          // Referral Data
          try {
            const refSnap = await getDoc(doc(db, "referrals", userId));
            if (refSnap.exists()) {
              const refData = refSnap.data();
              setReferralData({ f1Commission: refData?.f1Commission || 0, f2Commission: refData?.f2Commission || 0, totalCommission: refData?.totalCommission || 0, referredUsers: refData?.referredUsers || [] });
            } else {
              await setDoc(doc(db, "referrals", userId), { f1Commission: 0, f2Commission: 0, totalCommission: 0, referredUsers: [] });
              setReferralData({ f1Commission: 0, f2Commission: 0, totalCommission: 0, referredUsers: [] });
            }
          } catch (e) { console.error("Referral fetch error:", e); }

          // Transactions
          try {
            const transactionQuery = query(collection(db, "transactions"), where("userId", "==", userId), orderBy("createdAt", "desc"));
            const transactionSnap = await getDocs(transactionQuery);
            const txList = transactionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(txList);
          } catch (e) { console.error("Transactions fetch error:", e); }

        } catch (e) {
          console.error("Error fetching data:", e);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    });

    return () => {
      unsubscribe();
      if (redirectTimeout) clearTimeout(redirectTimeout);
    };
  }, [navigate]);

  // Auth Expiry Check
  useEffect(() => {
    if (!authInitialized) return;
    const checkExpiry = async () => {
      if (isAuthExpired() && auth.currentUser) {
        try { await signOut(auth); } catch {}
        try { localStorage.removeItem("userId"); clearAuthTimestamp(); } catch {}
        navigate("/app/signin");
      }
    };
    const interval = setInterval(checkExpiry, 60000);
    window.addEventListener("focus", checkExpiry);
    setTimeout(checkExpiry, 5000);

    return () => { clearInterval(interval); window.removeEventListener("focus", checkExpiry); };
  }, [authInitialized, navigate]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-green-600 text-white px-4 py-1 shadow-lg" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}>
        <div className="flex items-center space-x-3">
          <img src="/logo192.png" alt="Pall Network" className="w-8 h-8 rounded-full" />
          <h1 className="text-xl font-bold">Pall Network</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>Menu</Button>
      </div>

      {/* Dashboard / Mining */}
      <div className="flex-1 p-4">
        <MiningDashboard userId={user.id} />
      </div>
    </div>
  );
}