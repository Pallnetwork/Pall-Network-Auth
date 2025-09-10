import { useState } from "react";
import { Link, useLocation } from "wouter";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, getDocs, query, collection, where } from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handlePackageChange = (value: string) => {
    const packagePrices = {
      "Basic": 25,
      "Silver": 20,
      "Gold": 56,
      "Diamond": 100,
      "Premium": 100
    };
    setForm({ 
      ...form, 
      package: value, 
      packagePrice: packagePrices[value as keyof typeof packagePrices] 
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Check if invitation code exists and is valid (if provided)
      let referredBy = null;
      if (form.invitation) {
        const q = query(
          collection(db, "users"),
          where("referralCode", "==", form.invitation)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          referredBy = snap.docs[0].data().username;
        } else {
          setError("Invalid invitation code. Please check and try again.");
          setIsLoading(false);
          return;
        }
      }

      // Create Firebase Authentication user
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, {
        displayName: form.name
      });

      // Generate referral code for the new user
      const referralCode = form.username.toLowerCase() + "-" + user.uid.slice(0, 5);

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: form.email,
        name: form.name,
        username: form.username,
        id: user.uid,
        referralCode: referralCode,
        referredBy: referredBy || null,
        package: form.package,
        packagePrice: form.packagePrice,
        createdAt: new Date(),
      });

      // Create wallet document with default balance
      await setDoc(doc(db, "wallets", user.uid), {
        userId: user.uid,
        pallBalance: 0,
        usdtBalance: 0,
        currentPackage: form.package,
        miningSpeed: 1,
        packagePrice: form.packagePrice,
        miningActive: false,
        lastStart: null,
        totalEarnings: 0,
        createdAt: new Date(),
      });

      // Store userId in localStorage for immediate access
      localStorage.setItem("userId", user.uid);
      
      toast({
        title: "Success",
        description: referredBy 
          ? `Account created successfully! Referred by ${referredBy}.`
          : "Account created successfully!",
      });
      
      console.log("✅ User created in Firebase Auth:", user.uid);
      console.log("✅ User document created in Firestore");
      console.log("✅ Wallet document created with default balance");
      
      navigate("/app/dashboard");
    } catch (err: any) {
      console.error("❌ Signup error:", err);
      
      // Handle specific Firebase Auth errors
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please use a different email or sign in.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please use at least 6 characters.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address. Please check and try again.");
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
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Create Account</h2>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                required
                data-testid="input-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Choose a username"
                value={form.username}
                onChange={handleChange}
                required
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invitation">
                Invitation Code <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="invitation"
                name="invitation"
                type="text"
                placeholder="Enter invitation code if you have one"
                value={form.invitation}
                onChange={handleChange}
                data-testid="input-invitation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={handleChange}
                required
                data-testid="input-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package">Package</Label>
              <Select value={form.package} onValueChange={handlePackageChange} data-testid="select-package">
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic - $25 USDT</SelectItem>
                  <SelectItem value="Silver">Silver - $20 USDT</SelectItem>
                  <SelectItem value="Gold">Gold - $56 USDT</SelectItem>
                  <SelectItem value="Diamond">Diamond - $100 USDT</SelectItem>
                  <SelectItem value="Premium">Premium - $100 USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600"
              disabled={isLoading}
              data-testid="button-signup"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/app/signin" className="text-primary hover:underline" data-testid="link-signin">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
