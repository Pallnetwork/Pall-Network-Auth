// ForgotPassword.tsx
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import logo from "@/assets/logo.png"; // ✅ same logo

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleFindUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", form.email),
        where("fullName", "==", form.fullName)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        setUserId(snap.docs[0].id);
        setStep(2);
        toast({
          title: "User verified",
          description: "Enter your new password below.",
        });
      } else {
        setError("User not found. Please check your Email and Full Name.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (form.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    try {
      if (userId) {
        await updateDoc(doc(db, "users", userId), {
          password: form.newPassword,
        });
        toast({
          title: "Success",
          description: "Password updated successfully!",
        });
        navigate("/app/signin");
      }
    } catch {
      setError("Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-4">
      <div className="relative w-full max-w-md">
        {/* floating glass shapes */}
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
                Reset Password
              </h1>
              <p className="text-sm text-white/70">
                {step === 1
                  ? "Verify your account details"
                  : "Create a new secure password"}
              </p>
            </div>

            {step === 1 ? (
              <form onSubmit={handleFindUser} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-white/80">Email</Label>
                  <Input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="bg-white/20 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-white/80">Full Name</Label>
                  <Input
                    name="fullName"
                    type="text"
                    value={form.fullName}
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
                  className="w-full bg-blue-500 hover:bg-blue-600 rounded-xl"
                >
                  {isLoading ? "Verifying..." : "Next"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-white/80">New Password</Label>
                  <Input
                    name="newPassword"
                    type="password"
                    value={form.newPassword}
                    onChange={handleChange}
                    required
                    className="bg-white/20 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-white/80">Confirm Password</Label>
                  <Input
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
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
                  className="w-full bg-green-500 hover:bg-green-600 rounded-xl"
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}

            <div className="text-center text-sm">
              <Link href="/app/signin" className="text-white/80 hover:underline">
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}