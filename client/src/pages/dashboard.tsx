import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Menu, X, Home, User, Users, CreditCard, Info, Wallet, Shield, Pickaxe, Zap } from "lucide-react";
import MiningDashboard from "@/components/MiningDashboard";
import UpgradePage from "@/components/UpgradePage";
import PoliciesPage from "@/components/PoliciesPage";
import { collection, getDocs, query, where } from "firebase/firestore";

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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referrals, setReferrals] = useState<User[]>([]);
  const [f2Total, setF2Total] = useState(0);
  const [referralData, setReferralData] = useState<{
    f1Commission: number;
    f2Commission: number;
    totalCommission: number;
    referredUsers: string[];
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pallBalance, setPallBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
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
    photoURL: ""
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [shareLink, setShareLink] = useState("");
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

  // Real-time balance sync for mining dashboard
  useEffect(() => {
    let balanceInterval: NodeJS.Timeout;

    const syncBalance = async () => {
      const userId = localStorage.getItem("userId");
      if (userId) {
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
      }
    };

    // Sync balance every 5 seconds to reflect mining updates
    balanceInterval = setInterval(syncBalance, 5000);

    return () => {
      clearInterval(balanceInterval);
    };
  }, []);

  useEffect(() => {
    let redirectTimeout: NodeJS.Timeout;
    let authCheckCount = 0;

    // Authentication state listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      authCheckCount++;
      console.log(`🔥 Firebase Auth state changed (check #${authCheckCount}):`, firebaseUser ? `User logged in: ${firebaseUser.uid}` : 'No user');

      // Clear any pending redirect timeout
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }

      // Mark auth as initialized after first check
      setAuthInitialized(true);

      // If no firebase user -> wait longer for WebView/Android environment
      if (!firebaseUser) {
        console.log('⚠️ No Firebase user found, checking again in 3000ms before redirecting...');
        
        // Increased timeout for WebView environment - Android apps need more time
        redirectTimeout = setTimeout(() => {
          const currentUser = auth.currentUser;
          if (!currentUser) {
            console.log('❌ Confirmed: No Firebase user after extended timeout, redirecting to signin');
            localStorage.removeItem("userId");
            clearAuthTimestamp();
            navigate("/app/signin");
          } else {
            console.log('✅ False alarm: Firebase user found on double-check:', currentUser.uid);
          }
        }, 3000); // Increased from 500ms to 3000ms for WebView stability
        return;
      }

      // If user is present, set userId and timestamp then fetch data
      const userId = firebaseUser.uid;
      console.log('✅ Firebase user authenticated:', userId);
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

          // Fetch referral data
          try {
            const referralSnap = await getDoc(doc(db, "referrals", userId));

            // Fetch F1 referral users list
            try {
              const usersSnap = await getDoc(doc(db, "users", userId));
              if (usersSnap.exists()) {
                const q = query(
                  collection(db, "users"),
                  where("referredBy", "==", userId)
                );
                const snap = await getDocs(q);
                const list: User[] = snap.docs.map(d => d.data() as User);
                setReferrals(list);
              }
            } catch (e) {
              console.error("Error fetching referral users:", e);
            }

            if (referralSnap.exists()) {
              const refData = referralSnap.data();
              setReferralData({
                f1Commission: refData.f1Commission || 0,
                f2Commission: refData.f2Commission || 0,
                totalCommission: refData.totalCommission || 0,
                referredUsers: refData.referredUsers || [],
              });
            } else {
              // ✅ RULE-SAFE: frontend does NOTHING if doc missing
              setReferralData({
                f1Commission: 0,
                f2Commission: 0,
                totalCommission: 0,
                referredUsers: [],
              });
            }
          } catch (error) {
            console.error("Error fetching referral data:", error);
          }

          // Fetch transaction history
          try {
            const txSnap = await getDoc(doc(db, "transactions", userId));

            if (txSnap.exists()) {
              const txData = txSnap.data();
              setTransactions(txData?.items || []);
            } else {
              setTransactions([]);
            }
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
          console.log("🕐 Skipping expiry check - auth not initialized or no current user");
          return;
        }

        // Only act if expiry has a timestamp and it is expired
        if (isAuthExpired()) {
          console.log("⏰ Auth expired by timestamp, signing out user.");
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreview(result);
        setForm({ ...form, photoURL: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateShareLink = (referralCode: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/signup?ref=${referralCode}`;
  };

  const copyShareLink = () => {
    if (user?.referralCode) {
      const link = generateShareLink(user.referralCode);
      navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied!",
        description: "Your invitation link has been copied to clipboard",
      });
    }
  };

  const shareViaWhatsApp = () => {
    if (user?.referralCode) {
      const link = generateShareLink(user.referralCode);
      const message = `Join PALL NETWORK and start mining cryptocurrency! Use my referral link: ${link}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const shareViaTelegram = () => {
    if (user?.referralCode) {
      const link = generateShareLink(user.referralCode);
      const message = `Join PALL NETWORK and start mining cryptocurrency! Use my referral link: ${link}`;
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`;
      window.open(telegramUrl, '_blank');
    }
  };

  const saveProfile = async () => {
    if (profile) {
      toast({
        title: "Profile already exists",
        description: "Profile already filled, cannot edit again!",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    try {
      await setDoc(doc(db, "profiles", user.id), {
        ...form,
        userId: user.id,
        createdAt: new Date(),
      });
      setProfile({ ...form, userId: user.id, createdAt: new Date() });
      toast({
        title: "Success",
        description: "Profile saved successfully!",
      });
      // refresh timestamp - user performed an action
      setAuthTimestampNow();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
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
  const totalF1 = referralData?.f1Commission || 0;
  const totalF2 = referralData?.f2Commission || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar with Safe Area */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center bg-green-600 text-white p-2 pt-8 shadow-lg" style={{paddingTop: 'max(0.5rem, env(safe-area-inset-top, 1rem))'}}>
        <div className="flex items-center space-x-3">
          <img src="/logo192.png" alt="Pall Network" className="w-8 h-8 rounded-full" />
          <h1 className="text-xl font-bold">Pall Network</h1>
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
                onClick={() => { navigate("/app/dashboard/wallet"); setSidebarOpen(false); }}
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
      <div className="flex-1 p-6">
        <div className="container mx-auto max-w-4xl">
          {/* HOME Page */}
          {currentPage === "HOME" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2"></h2>
                <p className="text-muted-foreground mb-6">
                </p>
              </div>

              {/* Mining Dashboard - Main Feature */}
              <div className="mb-8">
                {user && <MiningDashboard userId={user.id} />}
              </div>

              {/* Quick Stats */}
              <div>
                <Card className="rounded-2xl shadow-md border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                  <CardContent className="p-6 text-center">
                    <h3 className="text-2xl font-bold text-green-600 mb-2">{referrals.length}</h3>
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
              {user.referralCode && (
                <Card className="rounded-2xl shadow-md border-0">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">Share & Earn 🎯</h3>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl mb-6 border border-blue-100 dark:border-blue-800">
                      <p className="text-sm font-medium text-muted-foreground mb-3 text-center">Your Referral Code:</p>
                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <code className="font-mono text-xl font-bold text-blue-600">{user.referralCode}</code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg font-bold hover:scale-105 transition-all duration-200"
                          onClick={() => {
                            navigator.clipboard.writeText(user.referralCode || "");
                            toast({
                              title: "Copied!",
                              description: "Referral code copied to clipboard",
                            });
                          }}
                          data-testid="button-copy-code"
                        >
                          📋 Copy Code
                        </Button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold mb-4 text-center">Share Your Link</h3>
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-xl mb-6 border border-green-100 dark:border-green-800">
                      <p className="text-sm font-mono break-all mb-4 text-center text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 p-3 rounded-lg">
                        {generateShareLink(user.referralCode)}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Button
                          onClick={copyShareLink}
                          className="w-full py-3 font-bold rounded-xl hover:scale-105 transition-all duration-200"
                          data-testid="button-copy-link"
                        >
                          📋 Copy Link
                        </Button>
                        <Button
                          onClick={shareViaWhatsApp}
                          className="w-full py-3 font-bold rounded-xl bg-green-500 hover:bg-green-600 text-white hover:scale-105 transition-all duration-200"
                          data-testid="button-share-whatsapp"
                        >
                          📱 WhatsApp
                        </Button>
                        <Button
                          onClick={shareViaTelegram}
                          className="w-full py-3 font-bold rounded-xl bg-blue-500 hover:bg-blue-600 text-white hover:scale-105 transition-all duration-200"
                        >
                          ✈️ Telegram
                        </Button>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-xl text-center">
                      <p className="text-base font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                        💰 Earn commissions from every referral!<br/>
                        🎯 <span className="font-bold text-green-600">Direct referrals (F1): 5% commission</span><br/>
                        🔗 <span className="font-bold text-blue-600">Indirect referrals (F2): 2.5% commission</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
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
                      <div>
                        <strong>First Name:</strong> {profile.firstName}
                      </div>
                      <div>
                        <strong>Last Name:</strong> {profile.lastName}
                      </div>
                      <div>
                        <strong>Date of Birth:</strong> {profile.dob}
                      </div>
                      <div>
                        <strong>Gender:</strong> {profile.gender}
                      </div>
                      <div>
                        <strong>Phone:</strong> {profile.phone}
                      </div>
                      <div>
                        <strong>Address:</strong> {profile.address}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Photo Upload */}
                    <div className="mb-6">
                      <Label htmlFor="photo">Profile Photo</Label>
                      <div className="mt-2 flex flex-col items-center">
                        {photoPreview ? (
                          <img 
                            src={photoPreview} 
                            alt="Preview" 
                            className="w-24 h-24 rounded-full object-cover mb-3"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3">
                            <User className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        <input
                          type="file"
                          id="photo"
                          name="photo"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                          data-testid="input-photo"
                        />
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('photo')?.click()}
                          className="text-sm"
                        >
                          Choose Photo
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleFormChange}
                          data-testid="input-first-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={form.lastName}
                          onChange={handleFormChange}
                          data-testid="input-last-name"
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
                          data-testid="input-dob"
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
                          data-testid="select-gender"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={form.phone}
                          onChange={handleFormChange}
                          data-testid="input-phone"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          name="address"
                          value={form.address}
                          onChange={handleFormChange}
                          data-testid="input-address"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={saveProfile}
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="button-save-profile"
                    >
                      Save Profile
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
                  {referrals.length === 0 ? (
                    <p className="text-muted-foreground mb-4">No direct referrals yet.</p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {referrals.map((referral, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 border rounded-lg bg-green-50 dark:bg-green-900/20"
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
                    <div>
                      <span className="text-muted-foreground">F2 Total:</span>
                      <span className="ml-2 font-bold text-blue-600" data-testid="f2-total">
                        {totalF2.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 font-bold">
                    Total Referral Commission: {(totalF1 + totalF2).toFixed(2)} USDT
                  </p>
                </div>

                {referrals.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No referrals yet. Share your referral code to start earning!
                    </p>
                    {user?.referralCode && (
                      <div className="bg-muted p-4 rounded-lg inline-block">
                        <code className="font-mono">{user.referralCode}</code>
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
                <p className="text-lg mb-2">💵 <strong>USDT Balance:</strong> {(totalF1 + totalF2).toFixed(2)} USDT</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Referral Earnings: F1 ({totalF1.toFixed(2)}) + F2 ({totalF2.toFixed(2)})</p>
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