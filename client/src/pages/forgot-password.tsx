import { useState } from "react";
import { Link, useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import logo from "@/assets/logo.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);

      toast({
        title: "Reset Email Sent",
        description: "Check your email to reset your password",
      });

      navigate("/app/signin");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address");
      } else {
        setError("Failed to send reset email. Try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-4">
      <div className="relative w-full max-w-md">

        {/* Floating UI */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/20 rounded-2xl blur-xl" />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/10 rounded-2xl blur-xl" />

        <Card className="relative backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl">
          <CardContent className="p-8 space-y-6">

            {/* Header */}
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
                Enter your email to receive reset link
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleReset} className="space-y-4">

              <div className="space-y-1">
                <Label className="text-white/80">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/20 border-white/20 text-white placeholder:text-white/60"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 text-red-200 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 rounded-xl"
              >
                {isLoading ? "Sending..." : "Send Reset Email"}
              </Button>
            </form>

            {/* Back */}
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