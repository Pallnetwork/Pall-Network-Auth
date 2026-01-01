import { useState } from "react";
import { Link, useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "",
    username: "",
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
        where("username", "==", form.username)
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
        setError("User not found. Please check your email and username.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Find user error:", err);
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
    } catch (err) {
      setError("Failed to update password. Please try again.");
      console.error("Reset password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Reset Password</h2>
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 ? (
            <>
              <p className="text-muted-foreground">
                Enter your email and username to verify your identity and reset your password.
              </p>
              <form onSubmit={handleFindUser} className="space-y-4">
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
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    data-testid="input-username"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-purple-500 hover:bg-purple-600"
                  disabled={isLoading}
                  data-testid="button-next"
                >
                  {isLoading ? "Verifying..." : "Next Step"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                User verified! Enter your new password below.
              </p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={form.newPassword}
                    onChange={handleChange}
                    required
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    data-testid="input-confirm-password"
                  />
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
                  data-testid="button-update-password"
                >
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </>
          )}

          <div className="text-center">
            <Link href="/app/signin" className="text-sm text-primary hover:underline" data-testid="link-signin">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
