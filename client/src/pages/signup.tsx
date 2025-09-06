import { useState } from "react";
import { Link, useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDocs, query, collection, where } from "firebase/firestore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

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
      "Gold": 56,
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
      const userId = uuidv4();

      // Generate referral code for the new user
      const referralCode = form.username.toLowerCase() + "-" + userId.slice(0, 5);

      let referredBy = null;

      // Check if invitation code exists and is valid
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
          return;
        }
      }

      await setDoc(doc(db, "users", userId), {
        ...form,
        id: userId,
        referralCode: referralCode,
        referredBy: referredBy || null,
        package: form.package,
        packagePrice: form.packagePrice,
        createdAt: new Date(),
      });
      
      localStorage.setItem("userId", userId);
      toast({
        title: "Success",
        description: referredBy 
          ? `Account created successfully! Referred by ${referredBy}.`
          : "Account created successfully!",
      });
      navigate("/dashboard");
    } catch (err) {
      setError("Failed to create account. Please try again.");
      console.error("Signup error:", err);
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
                  <SelectItem value="Gold">Gold - $56 USDT</SelectItem>
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
              <Link href="/signin" className="text-primary hover:underline" data-testid="link-signin">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
