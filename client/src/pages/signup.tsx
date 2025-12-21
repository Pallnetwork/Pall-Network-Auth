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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

export default function SignUp() {
  const [form, setForm] = useState({
    email: "",
    name: "",
    username: "",
    invitation: "",
    password: "",
    package: "Basic",
    packagePrice: 25,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // ✅ Agar user already login hai to redirect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/app/dashboard", { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handlePackageChange = (value: string) => {
    const packagePrices = {
      Basic: 25,
      Silver: 20,
      Gold: 56,
      Diamond: 100,
      Premium: 100,
    };
    setForm({
      ...form,
      package: value,
      packagePrice: packagePrices[value as keyof typeof packagePrices],
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // ✅ Invitation code OPTIONAL & SAFE
      let referredBy: string | null = null;

      if (form.invitation && form.invitation.trim() !== "") {
        const q = query(
          collection(db, "users"),
          where("referralCode", "==", form.invitation.trim())
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("Invalid invitation code. Please check and try again.");
          setIsLoading(false);
          return;
        }

        referredBy = snap.docs[0].data().username || null;
      }

      // ✅ Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = userCredential.user;

      // ✅ Update profile
      await updateProfile(user, {
        displayName: form.name,
      });

      // ✅ Generate referral code
      const referralCode =
        form.username.toLowerCase() + "-" + user.uid.slice(0, 5);

      // ✅ Save user document
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        email: form.email,
        name: form.name,
        username: form.username,
        referralCode,
        referredBy,
        package: form.package,
        packagePrice: form.packagePrice,
        createdAt: new Date(),
      });

      // ✅ Create wallet document
      await setDoc(doc(db, "wallets", user.uid), {
        userId: user.uid,
        pallBalance: 0,
        usdtBalance: 0,
        currentPackage: form.package,
        miningActive: false,
        lastStart: null,
        totalEarnings: 0,
        createdAt: new Date(),
      });

      // ✅ Cache user id
      localStorage.setItem("userId", user.uid);

      toast({
        title: "Success",
        description: referredBy
          ? `Account created! Referred by ${referredBy}`
          : "Account created successfully!",
      });

      navigate("/app/dashboard", { replace: true });
    } catch (err: any) {
      console.error("❌ Signup error:", err);

      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold">Create Account</h2>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input name="name" value={form.name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label>Username</Label>
              <Input name="username" value={form.username} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label>
                Invitation Code <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input name="invitation" value={form.invitation} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input name="password" type="password" value={form.password} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={form.package} onValueChange={handlePackageChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic - $25</SelectItem>
                  <SelectItem value="Silver">Silver - $20</SelectItem>
                  <SelectItem value="Gold">Gold - $56</SelectItem>
                  <SelectItem value="Diamond">Diamond - $100</SelectItem>
                  <SelectItem value="Premium">Premium - $100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>

            <div className="text-center text-sm">
              <Link href="/app/signin" className="text-primary">
                Already have an account? Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
