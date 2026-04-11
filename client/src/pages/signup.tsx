import { useState } from "react";
import { useLocation, Link } from "wouter";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";
import { handleReferralOnInstall } from "@/lib/referral";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
  });

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Password check
    if (form.password !== form.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // ================================
      // 1️⃣ CREATE AUTH USER
      // ================================
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const uid = userCred.user.uid;

      const cleanUsername = form.username.trim().toLowerCase();
      const cleanReferral = form.referralCode?.trim() || "";

      // ================================
      // 2️⃣ FIND REFERRER (SAFE)
      // ================================
      let referredByUID: string | null = null;

      if (cleanReferral) {
        try {
          referredByUID = await handleReferralOnInstall({
            ref: cleanReferral,
          });
        } catch (err) {
          console.warn("Referral lookup failed:", err);
          referredByUID = null;
        }
      }

      console.log("🎯 Referred By UID:", referredByUID);

      // ================================
      // 3️⃣ CREATE USER DOCUMENT (SOURCE OF TRUTH)
      // ================================
      await setDoc(doc(db, "users", uid), {
        id: uid,
        name: form.fullName.trim(),
        username: cleanUsername,
        email: form.email.trim(),

        package: "free",

        // 🔥 PHASE 1 FIX
        referredBy: referredByUID ?? null,
        referralCount: 0,

        createdAt: serverTimestamp(),

        // stable referral code
        referralCode: `${cleanUsername}-${uid.slice(0, 5)}`,
      });

      // ================================
      // 4️⃣ WALLET DOC
      // ================================
      await setDoc(doc(db, "wallets", uid), {
        userId: uid,
        pallBalance: 0,
        miningActive: false,
        lastStart: serverTimestamp(),
        lastMinedAt: serverTimestamp(),
        totalEarnings: 0,
        createdAt: serverTimestamp(),
      });

      // ================================
      // 5️⃣ DAILY REWARDS DOC
      // ================================
      await setDoc(doc(db, "dailyRewards", uid), {
        claimedCount: 0,
        lastResetDate: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // ================================
      // 6️⃣ UPDATE REFERRER COUNT (IMPORTANT FIX)
      // ================================
      if (referredByUID) {
        await setDoc(
          doc(db, "users", referredByUID),
          {
            referralCount: increment(1),
          },
          { merge: true }
        );
      }

      // ================================
      // SUCCESS
      // ================================
      toast({
        title: "Success",
        description: "Account created successfully",
      });

      setTimeout(() => {
        navigate("/app/dashboard");
      }, 500);
    } catch (error: any) {
      console.error("Signup error:", error);

      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <img
            src={logo}
            alt="Pall Network Logo"
            className="mx-auto w-14 h-14 rounded-xl object-contain"
          />
          <div>
            <h2 className="text-2xl font-bold">Create Account</h2>
            <p className="text-sm text-white/70">
              Join Pall Network & start mining
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">

            <div>
              <Label>Full Name</Label>
              <Input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                className="bg-white/20 border-white/30 text-white"
              />
            </div>

            <div>
              <Label>Username</Label>
              <Input
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                className="bg-white/20 border-white/30 text-white"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="bg-white/20 border-white/30 text-white"
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="bg-white/20 border-white/30 text-white pr-10"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-white/70"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="bg-white/20 border-white/30 text-white pr-10"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-white/70"
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <div>
              <Label>Referral Code (optional)</Label>
              <Input
                name="referralCode"
                value={form.referralCode}
                onChange={handleChange}
                className="bg-white/20 border-white/30 text-white"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-blue-600 hover:bg-white/90"
            >
              {loading ? "Creating..." : "Create Account"}
            </Button>

            <p className="text-sm text-center text-white/70">
              Already have an account?{" "}
              <Link href="/app/signin" className="underline text-white">
                Sign In
              </Link>
            </p>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}