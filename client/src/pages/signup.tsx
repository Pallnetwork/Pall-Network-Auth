import { useState } from "react";
import { Link, useLocation } from "wouter";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDocs,
  query,
  collection,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

function generateReferralCode(username: string, uid: string) {
  return `${username.toLowerCase()}-${uid.slice(0, 5)}`;
}

export default function SignUp() {
  const [form, setForm] = useState({
    email: "",
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
    referral: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // 1️⃣ CREATE AUTH USER
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = cred.user;

      // 2️⃣ REFERRAL CHECK (AFTER AUTH)
      let referredBy: string | null = null;

      if (form.referral.trim()) {
        const q = query(
          collection(db, "users"),
          where("referralCode", "==", form.referral.trim())
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("Invalid referral code");
          setIsLoading(false);
          return;
        }

        referredBy = snap.docs[0].id;
      }

      // 3️⃣ UPDATE PROFILE
      await updateProfile(user, {
        displayName: form.name,
      });

      // 4️⃣ CREATE USER DOC
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        email: form.email,
        name: form.name,
        username: form.username,
        referralCode: generateReferralCode(form.username, user.uid),
        referredBy,
        package: "free",
        createdAt: new Date(),
      });

      // 5️⃣ CREATE WALLET
      await setDoc(doc(db, "wallets", user.uid), {
        userId: user.uid,
        pallBalance: 0,
        usdtBalance: 0,
        currentPackage: "free",
        miningSpeed: 1,
        miningActive: false,
        lastStart: null,
        totalEarnings: 0,
        createdAt: new Date(),
      });

      toast({
        title: "Success",
        description: "Account created successfully",
      });

      // ✅ ONLY ONE REDIRECT — HERE
      navigate("/app/dashboard", { replace: true });

    } catch (err: any) {
      console.error(err);
      setError("Signup failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold">Create Account</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input name="name" value={form.name} onChange={handleChange} />
            </div>

            <div>
              <Label>Username</Label>
              <Input name="username" value={form.username} onChange={handleChange} />
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>

            <div>
              <Label>Password</Label>
              <Input type="password" name="password" value={form.password} onChange={handleChange} />
            </div>

            <div>
              <Label>Confirm Password</Label>
              <Input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} />
            </div>

            <div>
              <Label>Referral Code (optional)</Label>
              <Input name="referral" value={form.referral} onChange={handleChange} />
            </div>

            {error && (
              <div className="text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" /> {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Account"}
            </Button>

            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/app/signin" className="text-primary">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
