import { useState } from "react";
import { useLocation, Link } from "wouter";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  query,
  collection,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

export default function Signup() {
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
      // 1️⃣ Create auth user
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const uid = userCred.user.uid;
      console.log("✅ Auth user created:", uid);

      // 2️⃣ Referral lookup
      let referredByUID: string | null = null;

      if (form.referralCode.trim() !== "") {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("referralCode", "==", form.referralCode.trim())
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          referredByUID = snap.docs[0].id;
        }
      }

      // 3️⃣ Prepare documents
      const userDoc = doc(db, "users", uid);
      const walletDoc = doc(db, "wallets", uid);
      const dailyDoc = doc(db, "dailyRewards", uid);
      const referralDoc = doc(db, "referrals", uid);

      // 4️⃣ Create all docs together (Spark safe)
      await Promise.all([
        setDoc(userDoc, {
          id: uid,
          name: form.fullName,
          username: form.username,
          email: form.email,
          package: "free",
          referredBy: referredByUID,
          createdAt: serverTimestamp(),
          referralCode: `${form.username}-${uid.slice(0, 5)}`,
        }),

        setDoc(walletDoc, {
          userId: uid,
          pallBalance: 0,
          miningActive: false,
          lastStart: serverTimestamp(),
          lastMinedAt: serverTimestamp(),
          totalEarnings: 0,
          createdAt: serverTimestamp(),
        }),

        setDoc(dailyDoc, {
          claimedCount: 0,
          lastResetDate: serverTimestamp(),
          createdAt: serverTimestamp(),
        }),

        setDoc(referralDoc, {
          referredBy: referredByUID,
          createdAt: serverTimestamp(),
        }),
      ]);

      console.log("✅ All Firestore docs created");

      toast({
        title: "Success",
        description: "Account created successfully",
      });

      // 5️⃣ Wait for auth state, then redirect
      setTimeout(() => {
        navigate("/app/dashboard");
      }, 400);

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

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="bg-white/20 border-white/30 text-white"
              />
            </div>

            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                className="bg-white/20 border-white/30 text-white"
              />
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
