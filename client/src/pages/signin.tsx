// client/src/pages/signin.tsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

export default function SignIn() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // ✅ Check if user already logged in with WebView considerations
  useEffect(() => {
    let authCheckTimeout: NodeJS.Timeout;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("🔄 User already signed in:", user.uid);

        // First-time login → ensure wallet exists
        const walletRef = doc(db, "wallets", user.uid);
        const walletSnap = await getDoc(walletRef);
        if (!walletSnap.exists()) {
          await setDoc(walletRef, {
            pallBalance: 0,
            miningActive: false,
            lastStart: null,
            lastMinedAt: null,
          });
          console.log("⚡ Wallet auto-created for first-time user");
        }

        const isAndroidApp = /PallNetworkApp/i.test(navigator.userAgent);
        const delay = isAndroidApp ? 1000 : 100; // 1s for Android WebView
        authCheckTimeout = setTimeout(() => navigate("/app/dashboard", { replace: true }), delay);
      }
    });
    
    return () => {
      unsubscribe();
      if (authCheckTimeout) clearTimeout(authCheckTimeout);
    };
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;

      console.log("🔥 REAL AUTH USER:", auth.currentUser);

      // LocalStorage save (extra layer)
      localStorage.setItem("userId", user.uid);

      toast({ title: "Success", description: "You have been signed in successfully!" });
      console.log("✅ User signed in successfully:", user.uid);

      // First-time login → ensure wallet exists
      const walletRef = doc(db, "wallets", user.uid);
      const walletSnap = await getDoc(walletRef);
      if (!walletSnap.exists()) {
        await setDoc(walletRef, {
          pallBalance: 0,
          miningActive: false,
          lastStart: null,
          lastMinedAt: null,
        });
        console.log("⚡ Wallet auto-created for first-time user");
      }

      const isAndroidApp = /PallNetworkApp/i.test(navigator.userAgent);
      if (isAndroidApp) setTimeout(() => navigate("/app/dashboard", { replace: true }), 1500);
      else navigate("/app/dashboard", { replace: true });
    } catch (err: any) {
      console.error("❌ Signin error:", err);
      if (err.code === "auth/user-not-found") setError("No account found with this email.");
      else if (err.code === "auth/wrong-password") setError("Incorrect password.");
      else if (err.code === "auth/invalid-email") setError("Invalid email address.");
      else if (err.code === "auth/too-many-requests") setError("Too many failed attempts. Try later.");
      else setError("Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Sign In</h2>
            <div className="w-3 h-3 rounded-full bg-primary"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="Enter your email" value={form.email} onChange={handleChange} required data-testid="input-email"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="Enter your password" value={form.password} onChange={handleChange} required data-testid="input-password"/>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-signin">
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            <div className="space-y-2 text-center">
              <Link href="/app/forgot-password" className="text-sm text-primary hover:underline block" data-testid="link-forgot-password">Forgot Password?</Link>
              <div className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/app/signup" className="text-primary hover:underline" data-testid="link-signup">Create Account</Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}