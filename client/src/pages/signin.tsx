// client/src/pages/signin.tsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import logo from "@/assets/logo.png"; // ✅ REAL LOGO IMPORT

export default function SignIn() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // 🔒 Auth check (UNCHANGED)
  useEffect(() => {
    let authCheckTimeout: NodeJS.Timeout;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const walletRef = doc(db, "wallets", user.uid);
        const walletSnap = await getDoc(walletRef);
        if (!walletSnap.exists()) {
          await setDoc(walletRef, {
            pallBalance: 0,
            miningActive: false,
            lastStart: null,
            lastMinedAt: null,
          });
        }

        const isAndroidApp = /PallNetworkApp/i.test(navigator.userAgent);
        authCheckTimeout = setTimeout(
          () => navigate("/app/dashboard", { replace: true }),
          isAndroidApp ? 1000 : 100
        );
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
      const userCredential = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      localStorage.setItem("userId", userCredential.user.uid);

      toast({
        title: "Success",
        description: "Signed in successfully",
      });

      const isAndroidApp = /PallNetworkApp/i.test(navigator.userAgent);
      setTimeout(
        () => navigate("/app/dashboard", { replace: true }),
        isAndroidApp ? 1500 : 0
      );
    } catch (err: any) {
      if (err.code === "auth/user-not-found") setError("No account found with this email.");
      else if (err.code === "auth/wrong-password") setError("Incorrect password.");
      else if (err.code === "auth/invalid-email") setError("Invalid email address.");
      else if (err.code === "auth/too-many-requests") setError("Too many attempts. Try later.");
      else setError("Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-4">
      <div className="relative w-full max-w-md">
        {/* Floating glass shapes */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/20 rounded-2xl blur-xl" />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/10 rounded-2xl blur-xl" />

        <Card className="relative backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl">
          <CardContent className="p-8 space-y-6">
            {/* Logo + Title */}
            <div className="text-center space-y-2">
              <img
                src={logo}
                alt="Pall Network Logo"
                className="mx-auto w-16 h-16 rounded-xl object-contain"
              />

              <h1 className="text-2xl font-semibold text-white">
                Welcome to Pall Network
              </h1>
              <p className="text-sm text-white/70">
                Sign in to continue mining
              </p>
            </div>

            <form onSubmit={handleSignin} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-white/80">Email</Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="bg-white/20 border-white/20 text-white placeholder:text-white/60"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-white/80">Password</Label>
                <Input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="bg-white/20 border-white/20 text-white placeholder:text-white/60"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 text-red-200 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>

              <div className="text-center space-y-2 text-sm">
                <Link
                  href="/app/forgot-password"
                  className="text-white/80 hover:underline"
                >
                  Forgot Password?
                </Link>
                <div className="text-white/70">
                  Don’t have an account?{" "}
                  <Link
                    href="/app/signup"
                    className="text-white font-medium hover:underline"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}