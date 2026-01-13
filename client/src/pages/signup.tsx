import { useState, useEffect } from "react";
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
  onAuthStateChanged,
} from "firebase/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

// 🔹 Simple referral code generator
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
    referral: "", // 🔗 optional referral input
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/app/dashboard", { replace: true });
    });
    return () => unsub();
  }, [navigate]);

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
      // 🔍 STEP 1 — validate referral (if provided)
      let referredBy: string | null = null;

      if (form.referral.trim() !== "") {
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

        referredBy = snap.docs[0].id; // ✅ F1 UID
      }

      // 🔐 STEP 2 — create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: form.name,
      });

      // 🧾 STEP 3 — generate own referral code
      const myReferralCode = generateReferralCode(
        form.username,
        user.uid
      );

      // 👤 STEP 4 — create user document
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        email: form.email,
        name: form.name,
        username: form.username,
        referralCode: myReferralCode,
        referredBy, // ✅ null OR UID
        package: "free",
        createdAt: new Date(),
      });

      // 👛 STEP 5 — create wallet
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

      localStorage.setItem("userId", user.uid);

      toast({
        title: "Success",
        description: "Account created successfully!",
      });

      navigate("/app/dashboard", { replace: true });
    } catch (err: any) {
      console.error("Signup error:", err);

      if (err.code === "auth/email-already-in-use")
        setError("This email is already registered.");
      else if (err.code === "auth/weak-password")
        setError("Password must be at least 6 characters.");
      else if (err.code === "auth/invalid-email")
        setError("Invalid email address.");
      else setError("Failed to create account. Please try again.");
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
              <Input name="name" value={form.name} onChange={handleChange} required />
            </div>

            <div>
              <Label>Username</Label>
              <Input name="username" value={form.username} onChange={handleChange} required />
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>

            <div>
              <Label>Password</Label>
              <Input type="password" name="password" value={form.password} onChange={handleChange} required />
            </div>

            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            {/* 🔗 OPTIONAL REFERRAL */}
            <div>
              <Label>Referral Code (optional)</Label>
              <Input
                name="referral"
                value={form.referral}
                onChange={handleChange}
                placeholder="Enter referral code"
              />
            </div>

            {error && (
              <div className="p-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" /> {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
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
