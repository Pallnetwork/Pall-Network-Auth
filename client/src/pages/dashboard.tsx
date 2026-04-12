import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Menu, X, Home, User, Users, Info, Wallet, Shield, Zap } from "lucide-react";
import MiningDashboard from "@/components/MiningDashboard";
import UpgradePage from "@/components/UpgradePage";
import PoliciesPage from "@/components/PoliciesPage";
import Splash from "@/pages/Splash";
import { saveUserProfile } from "@/lib/profile";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { doc, getDoc, collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import {
  generateReferralLink,
  generateReferralMessage,
  getReferralUsers,
  getReferralData
} from "@/lib/referral";

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

  // ✅ SUBSCRIPTION BLOCK
  subscription?: {
    status: "active" | "inactive" | "pending";
    plan?: string;
    activatedAt?: any;
  };
}

// ---- AUTH EXPIRY: 24 HOURS ----
const AUTH_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours in ms
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
    if (!ts || Number.isNaN(ts)) return false; // no ts -> not expired by this logic
    return Date.now() - ts > AUTH_EXPIRY_MS;
  } catch (e) {
    console.warn("Error checking auth expiry:", e);
    return false;
  }
}

export default function Dashboard() {
  const { theme, setTheme } = useTheme();

  // ================== 👇 TRADING CARDS SLIDER STATE START 👇 ==================

 const tradingCards = [
   { emoji: "🧠", title: "Trade Smart, Not Hard", bgColor: "#f4a261" },
   { emoji: "🎯", title: "Discipline Wins", bgColor: "#e76f51" },
   { emoji: "📈", title: "Learn Before You Earn", bgColor: "#0f4c81" },
   { emoji: "⚖️", title: "Risk Before Reward", bgColor: "#1a936f" },
 ];

 const [currentCardIndex, setCurrentCardIndex] = useState(0);

 useEffect(() => {
   const interval = setInterval(() => {
     setCurrentCardIndex((prev) => (prev + 1) % tradingCards.length);
   }, 3000);

   return () => clearInterval(interval);
 }, []);

 // ================== 👆 TRADING CARDS SLIDER STATE END 👆 =================

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // 🔐 SUBSCRIPTION CHECK
  const isSubscribed = profile?.subscription?.status === "active";

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        dob: profile.dob || "",
        gender: profile.gender || "",
        phone: profile.phone || "",
        address: profile.address || ""
      });
    }
  }, [profile]);

  const [referrals, setReferrals] = useState<User[]>([]);
  const safeReferrals = referrals || [];
  const [referralData, setReferralData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [latestPlan, setLatestPlan] = useState<any>(null);
  const [pallBalance, setPallBalance] = useState(0);
  const [miningStatus, setMiningStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    phone: "",
    address: "",
  });

  const [path, navigate] = useLocation();
  const { toast } = useToast();

  // Derive current page from URL path instead of internal state
  const currentPage = (() => {
    if (path === '/app/dashboard/profile') return 'PROFILE';
    if (path === '/app/dashboard/referral') return 'REFERRAL';
    if (path === '/app/dashboard/wallet') return 'WALLET';
    if (path === '/app/dashboard/upgrade') return 'UPGRADE';
    if (path === '/app/dashboard/policies') return 'ABOUT';
    return 'HOME'; // default for /app/dashboard
  })();

  // only once balance sync for mining dashboard
  useEffect(() => {
    const syncBalance = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const walletSnap = await getDoc(doc(db, "wallets", userId));
        if (walletSnap.exists()) {
          const walletData = walletSnap.data();
          setPallBalance(walletData.pallBalance || 0);
          setMiningStatus(walletData.miningActive || false);
        }
      } catch (error) {
        console.error("Error syncing balance:", error);
      }
    };

    syncBalance(); // ✅ only once on mount
  }, []);

  useEffect(() => {
    let redirectTimeout: NodeJS.Timeout;
    let authCheckCount = 0;

    // Authentication state listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      authCheckCount++;

      // Clear any pending redirect timeout
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }

      // Mark auth as initialized after first check
      setAuthInitialized(true);

      // If no firebase user -> wait longer for WebView/Android environment
      if (!firebaseUser) {

        // Increased timeout for WebView environment - Android apps need more time
        redirectTimeout = setTimeout(() => {
          const currentUser = auth.currentUser;
          if (!currentUser) {
            localStorage.removeItem("userId");
            clearAuthTimestamp();
            navigate("/app/signin");
          } else {
          }
        }, 3000); // Increased from 500ms to 3000ms for WebView stability
        return;
      }

      // If user is present, set userId and timestamp then fetch data
      const userId = firebaseUser.uid;

      try {
        localStorage.setItem("userId", userId);
      } catch (e) {
        console.warn("Could not set userId in localStorage:", e);
      }

      // Set auth timestamp now (login time / refresh)
      setAuthTimestampNow();

      const fetchData = async () => {
        try {
          // Fetch user data
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            // User document doesn't exist, sign out and redirect
            await signOut(auth);
            localStorage.removeItem("userId");
            clearAuthTimestamp();
            navigate("/app/signin");
            return;
          }

          // Fetch profile data
          const profileDoc = await getDoc(doc(db, "profiles", userId));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as Profile);
          }

          // ✅ PHASE 1 CLEAN REFERRAL SYSTEM
          try {
            const [refData, refUsers] = await Promise.all([
              getReferralData(userId),
              getReferralUsers(userId),
            ]);

            setReferralData(refData || {
              f1Commission: 0,
              totalCommission: 0,
              referredUsers: [],
              totalReferrals: 0,
            });

            setReferrals(refUsers || []);
          } catch (error) {
            console.error("❌ Referral system error:", error);

            setReferralData({
              f1Commission: 0,
              totalCommission: 0,
              referredUsers: [],
              totalReferrals: 0,
            });

            setReferrals([]);
          }

          // Fetch transaction history (FIXED FOR ADMIN PANEL COMPATIBILITY)
          try {
            const q = query(
              collection(db, "transactions"),
              where("userId", "==", userId)
            );

            const snap = await getDocs(q);

            const txList: any[] = [];

            snap.forEach((d) => {
              const data = d.data();

              txList.push({
                id: d.id,
                plan: data.plan,
                status: data.status,
                txid: data.txid,
                createdAt: data.createdAt,
              });
            });

            setTransactions(txList);

            // latest plan (NEWEST FIRST)
            const latest = txList
              .filter((t: any) => t.plan)
              .sort(
                (a: any, b: any) =>
                  (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
              )[0];

            setLatestPlan(latest || null);
          } catch (error) {
            console.error("Transactions fetch error:", error);
          }

          // Refresh auth timestamp after successful data fetch so active users stay logged in
          setAuthTimestampNow();

        } catch (error) {
          console.error("Error fetching data:", error);
          // Don't automatically sign out on data fetch errors
          // The user is still authenticated with Firebase
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    });

    // Cleanup the listener and any pending timeouts on unmount
    return () => {
      unsubscribe();
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [navigate]);

  // Expiry checker: run after auth is initialized, every 60s, and when window gains focus
  useEffect(() => {
    let expiryInterval: NodeJS.Timeout | null = null;

    const checkExpiryAndSignOut = async () => {
      try {
        // Only check expiry if auth has been initialized and we have a user
        if (!authInitialized || !auth.currentUser) {
          return;
        }

        // Only act if expiry has a timestamp and it is expired
        if (isAuthExpired()) {
          // Sign out
          try {
            await signOut(auth);
          } catch (e) {
            console.warn("Error during signOut:", e);
          }
          try {
            localStorage.removeItem("userId");
            clearAuthTimestamp();
          } catch (e) {
            console.warn("Could not clear localStorage during expiry signout:", e);
          }
          // navigate to signin
          navigate("/app/signin");
        }
      } catch (e) {
        console.warn("Error checking expiry:", e);
      }
    };

    // Skip immediate check - wait for auth to initialize first
    if (authInitialized) {
      // Delay first check by 5 seconds to allow full auth initialization
      setTimeout(checkExpiryAndSignOut, 5000);

      // periodic check every 60 seconds
      expiryInterval = setInterval(checkExpiryAndSignOut, 60 * 1000);
    }

    // also check when window/tab gets focus (user comes back)
    window.addEventListener("focus", checkExpiryAndSignOut);

    return () => {
      if (expiryInterval) clearInterval(expiryInterval);
      window.removeEventListener("focus", checkExpiryAndSignOut);
    };
  }, [navigate, authInitialized]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const shareViaWhatsApp = () => {
    if (user?.referralCode) {
      const message = generateReferralMessage(user?.referralCode);
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    }
  };

  const handleSaveProfile = async () => {

    if (!user) return;

    try {
      const result = await saveUserProfile(
        user.id,
        form,
      );

      if (result?.success) {
        toast({
          title: "Success",
          description: "Profile saved successfully",
        });

        // 🔥 Refresh real Firestore data (NO fake state)
        const snap = await getDoc(doc(db, "profiles", user.id));

        if (snap.exists()) {
          setProfile(snap.data() as Profile);
        }
      } else {
        toast({
          title: "Error",
          description: "Profile save failed",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      // Sign out from Firebase Auth (this will trigger the auth state listener)
      await signOut(auth);
      localStorage.removeItem("userId");
      clearAuthTimestamp();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate("/app/signin");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  // Commission Totals
  const totalF1 = referralData?.f1Commission ?? 0;

  if (isLoading) {
    return <Splash />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar with Safe Area */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center bg-green-600 text-white p-2 pt-4 shadow-lg" style={{paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))'}}>
        <div className="flex items-center space-x-3">
          <img src="/logo192.png" alt="Pall Network" className="w-8 h-8 rounded-full" />
          <h1 className="text-2xl font-bold">Pall Network</h1>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white hover:bg-green-700"
          data-testid="button-menu"
        >
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-900 shadow-lg z-50 border-l">
          <div className="p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                data-testid="button-close-sidebar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="space-y-4">
              <Button
                variant={currentPage === "HOME" ? "secondary" : "ghost"}
                className="w-full justify-start py-3 text-base font-medium"
                onClick={() => { navigate("/app/dashboard"); setSidebarOpen(false); }}
                data-testid="nav-home"
              >
                <Home className="w-5 h-5 mr-3" />
                HOME
              </Button>
              <Button
                variant={currentPage === "PROFILE" ? "secondary" : "ghost"}
                className="w-full justify-start py-3 text-base font-medium"
                onClick={() => { navigate("/app/dashboard/profile"); setSidebarOpen(false); }}
                data-testid="nav-profile"
              >
                <User className="w-5 h-5 mr-3" />
                PROFILE
              </Button>
              <Button
                variant={currentPage === "REFERRAL" ? "secondary" : "ghost"}
                className="w-full justify-start py-3 text-base font-medium"
                onClick={() => { navigate("/app/dashboard/referral"); setSidebarOpen(false); }}
                data-testid="nav-referral"
              >
                <Users className="w-5 h-5 mr-3" />
                REFERRAL TEAM
              </Button>
              <Button
                variant={currentPage === "WALLET" ? "secondary" : "ghost"}
                className="w-full justify-start py-3 text-base font-medium"
                onClick={() => {
                  const walletAdShown = sessionStorage.getItem("walletAdShown");

                  // 👇 1 ad per app open
                  if (!walletAdShown && window.AndroidBridge?.showInterstitialForWallet) {
                    sessionStorage.setItem("walletAdShown", "true");

                    window.AndroidBridge.showInterstitialForWallet(() => {
                      navigate("/app/dashboard/wallet");
                      setSidebarOpen(false);
                    });

                    return;
                  }

                  // 👇 already ad shown in this session
                  navigate("/app/dashboard/wallet");
                  setSidebarOpen(false);
                }}
                data-testid="nav-wallet"
              >
                <Wallet className="w-5 h-5 mr-3" />
                WALLET
              </Button>
              <Button
                variant={currentPage === "UPGRADE" ? "secondary" : "ghost"}
                className="w-full justify-start py-3 text-base font-medium"
                onClick={() => { navigate("/app/dashboard/upgrade"); setSidebarOpen(false); }}
                data-testid="nav-upgrade"
              >
                <Zap className="w-5 h-5 mr-3" />
                UPGRADE
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start py-3 text-base font-medium"
                onClick={() => {
                  setSidebarOpen(false);
                  navigate("/app/kyc");
                }}
                data-testid="nav-kyc"
              >
                <Shield className="w-5 h-5 mr-3" />
                KYC VERIFICATION
              </Button>
              <Button
                variant={currentPage === "ABOUT" ? "secondary" : "ghost"}
                className="w-full justify-start py-3 text-base font-medium"
                onClick={() => { navigate("/app/dashboard/policies"); setSidebarOpen(false); }}
                data-testid="nav-about"
              >
                <Info className="w-5 h-5 mr-3" />
                POLICIES
              </Button>
            </nav>
            <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full py-3 text-base font-bold rounded-xl hover:bg-red-600 transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 pt-16">
        <div className="container mx-auto max-w-4xl">
          {/* HOME Page */}
          {currentPage === "HOME" && (
            <div className="space-y-6">
              {/* 🌙☀️ Dark Mode Toggle */}
              <div className="flex justify-end">
               <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full"
              >
                {theme === "dark" ? (
                 <Sun className="h-5 w-5 text-yellow-400" />
                ):(
                 <Moon className="h-5 w-5 text-blue-500" />
                )}
               </Button>
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2"></h2>
                <p className="text-muted-foreground mb-6">
                </p>
              </div>

              {/* ==================👇 TRADING CARDS SLIDER START 👇================== */}

              <div className="mb-6">
                <div
                  className="p-4 rounded-xl shadow-lg text-white text-center font-bold text-lg transition-all duration-500"
                  style={{ backgroundColor: tradingCards[currentCardIndex].bgColor }}
                >
                  <span className="mr-2">{tradingCards[currentCardIndex].emoji}</span>
                  {tradingCards[currentCardIndex].title}
                </div>
              </div>

              {/* ================== 👆 TRADING CARDS SLIDER END 👆 ================== */}

              {/* 🧾 PLAN STATUS INDICATOR (PHASE 4 - STEP 4) */}
              {latestPlan && (
                <div className="p-4 rounded-lg border mb-4 bg-blue-50 dark:bg-blue-900/20">
                  <p className="font-semibold">📦 Plan Request Status</p>

                  <p className="text-sm mt-1">
                    Plan: <strong>{latestPlan.plan}</strong>
                  </p>

                  <p className="text-sm">
                    Status:
                    <span
                      className={
                        latestPlan.status === "pending"
                        ? "text-yellow-600 font-bold ml-2"
                        : latestPlan.status === "approved"
                        ? "text-green-600 font-bold ml-2"
                        : "text-red-600 font-bold ml-2"
                      }
                    >
                      {latestPlan.status}
                    </span>
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    TxID: {latestPlan.txid}
                  </p>
                </div>
              )}

              {/* 🔐 Subscription Status */}
              {profile?.subscription?.status === "pending" && (
                <div className="p-4 text-center border rounded-lg bg-yellow-50 mb-4">
                  ⏳ Your payment is under review. Please wait for admin approval.
                </div>
              )}

              {profile?.subscription?.status === "inactive" && (
                <div className="p-4 text-center border rounded-lg bg-red-50 mb-4">
                  ❌ Your subscription is inactive. Please contact support.
                </div>
              )}

              {/* Mining Dashboard - Main Feature */}
              <div className="mb-8">
                {user && (
                  <MiningDashboard userId={user.id} />
                )}
              </div>

              {/* Quick Stats */}
              <div>
                <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                  <CardContent className="p-6 text-center">
                    <h3 className="text-2xl font-bold text-green-600 mb-2">
                      {referralData?.totalReferrals ?? 0}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground">Total Referrals</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/20">
                  <CardContent className="p-6 text-center">
                    <h3 className={`text-2xl font-bold mb-2 ${miningStatus ? 'text-green-600' : 'text-gray-500'}`}>
                      {miningStatus ? '⚡ Active' : '⛏ Idle'}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground">Mining Status</p>
                  </CardContent>
                </Card>
              </div>

              {/* Referral Code & Invitation Links */}
              <Card className="rounded-2xl shadow-lg border-0">
                <CardContent className="p-6 space-y-6">

                  {/* Header */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold">🚀 Invite & Earn</h3>
                    <p className="text-sm text-muted-foreground">
                      Share your referral link and earn commissions
                    </p>
                  </div>

                  {/* Referral Code */}
                  <div className="bg-muted p-4 rounded-xl flex justify-between items-center">
                    <code className="font-mono text-lg">{user?.referralCode}</code>
                    <Button size="sm" onClick={() => {
                      navigator.clipboard.writeText(user?.referralCode || "");
                      toast({ title: "Copied!" });
                    }}>
                      Copy
                    </Button>
                  </div>

                  {/* Referral Link */}
                  <div className="bg-muted p-4 rounded-xl text-center">
                    <p className="text-xs break-all mb-3">
                      {generateReferralLink(user?.referralCode)}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => {
                        navigator.clipboard.writeText(generateReferralLink(user?.referralCode));
                      }}>
                        Copy Link
                      </Button>
                      <Button onClick={shareViaWhatsApp}>
                        WhatsApp
                      </Button>
                    </div>
                  </div>

                  {/* Commission Info */}
                  <div className="text-sm text-center text-muted-foreground">
                    <p>F1: <span className="text-green-600 font-bold">5%</span></p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* PROFILE Page */}
          {currentPage === "PROFILE" && (
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold">Profile Information</h2>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><strong>First Name:</strong> {profile.firstName}</div>
                      <div><strong>Last Name:</strong> {profile.lastName}</div>
                      <div><strong>Date of Birth:</strong> {profile.dob}</div>
                      <div><strong>Gender:</strong> {profile.gender}</div>
                      <div><strong>Phone:</strong> {profile.phone}</div>
                      <div><strong>Address:</strong> {profile.address}</div>

                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">

                    {/* Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleFormChange}
                        />
                      </div>

                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={form.lastName}
                          onChange={handleFormChange}
                        />
                      </div>

                      <div>
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input
                          id="dob"
                          name="dob"
                          type="date"
                          value={form.dob}
                          onChange={handleFormChange}
                        />
                      </div>

                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <select
                          id="gender"
                          name="gender"
                          value={form.gender}
                          onChange={handleFormChange}
                          className="w-full p-2 border border-input rounded-md bg-background"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>

                      {/* ✅ Phone */}
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={form.phone}
                          onChange={handleFormChange}
                        />
                      </div>

                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          name="address"
                          value={form.address}
                          onChange={handleFormChange}
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <Button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={
                        profile || // 👈 already saved → disable forever
                        !form.firstName ||
                        !form.lastName ||
                        !form.phone ||
                        !form.address
                      }
                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {profile ? "Profile Saved" : "Save Profile"}
                    </Button>

                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* REFERRAL Page */}
          {currentPage === "REFERRAL" && (
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold">Referral Team</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* F1 Direct Referrals */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-green-600">
                    Direct Referrals (F1) – 5% Commission
                  </h3>
                  {safeReferrals.length === 0 ? (
                    <p className="text-muted-foreground mb-4">No direct referrals yet.</p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {safeReferrals.map((referral, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center sm:p-3 md:p-4 lg:p-5 rounded-xl bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 shadow-sm"
                          data-testid={`f1-referral-${index}`}
                        >
                          <div>
                            <p className="font-medium">@{referral.username}</p>
                            <p className="text-sm text-muted-foreground">
                              Joined {formatDate(referral.createdAt)}
                            </p>
                          </div>
                          <div className="text-green-600 font-bold">
                            5% ({(0.05 * (referral.packagePrice || 100)).toFixed(2)} USDT)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                              {/* Commission Summary */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Commission Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">F1 Total:</span>
                      <span className="ml-2 font-bold text-green-600">
                        {totalF1.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                </div>

                {safeReferrals.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No referrals yet. Share your referral code to start earning!
                    </p>
                    {user?.referralCode && (
                      <div className="bg-muted p-4 rounded-lg inline-block">
                        <code className="font-mono">{user?.referralCode}</code>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* UPGRADE Page */}
          {currentPage === "UPGRADE" && user && (
            <UpgradePage userId={user.id} />
          )}

          {/* WALLET Page */}
          {currentPage === "WALLET" && (
            <div className="bg-white dark:bg-card p-6 rounded shadow-md max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">💳 Wallet</h2>

              {/* Balance Display */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                <p className="text-lg mb-2">💰 <strong>PALL Balance:</strong> {pallBalance.toFixed(4)} PALL</p>
                <p className="text-lg mb-2">💵 <strong>USDT Balance:</strong> {totalF1.toFixed(2)} USDT</p>
              </div>

              {/* Wallet Connection Status */}
              <div className="mb-4 p-3 border rounded-lg">
                {typeof window !== 'undefined' && (window as any).ethereum ? (
                  <div className="text-center">
                    <div className="text-green-600 dark:text-green-400 mb-2">✅ Web3 Wallet Detected</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {(window as any).ethereum.isMetaMask ? "MetaMask" :
                       (window as any).ethereum.isTrust ? "Trust Wallet" :
                       (window as any).ethereum.isCoinbaseWallet ? "Coinbase Wallet" : "Web3 Wallet"} is installed
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-yellow-600 dark:text-yellow-400 mb-2">⚠️ No Web3 Wallet Found</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Install a Web3 wallet to enable USDT transactions
                    </p>
                    <div className="space-y-2">
                      <a
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-orange-500 hover:bg-orange-600 text-white p-2 rounded text-center transition-colors"
                      >
                        📦 Install MetaMask
                      </a>
                      <a
                        href="https://trustwallet.com/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded text-center transition-colors"
                      >
                        📱 Install Trust Wallet
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction Info */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <p>💡 <strong>Note:</strong> This is a cloud mining simulation platform.</p>
                <p>USDT transactions are processed via blockchain wallets.</p>
              </div>
            </div>
          )}




          {/* ABOUT Page */}
          {currentPage === "ABOUT" && (
            <PoliciesPage onBack={() => navigate("/app/dashboard")} />
          )}
        </div>
      </div>
    </div>
  );
}
