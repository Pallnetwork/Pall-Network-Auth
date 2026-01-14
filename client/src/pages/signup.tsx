import { useState } from "react";
import { useNavigate } from "wouter";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SignUp() {
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
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateReferralCode = (username: string, uid: string) => {
    return `${username}-${uid.slice(0, 5)}`;
  };

  const handleSignUp = async () => {
    if (form.password !== form.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const newUserUID = userCredential.user.uid;

      // 2️⃣ Referral Handling (SAFE)
      let referredByUID: string | null = null;
      const codeInput = form.referralCode?.trim();

      if (codeInput) {
        try {
          const q = query(
            collection(db, "users"),
            where("referralCode", "==", codeInput)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            referredByUID = snap.docs[0].id; // ✅ UID only
            console.log("Referral UID found:", referredByUID);
          } else {
            console.warn("Referral code invalid or not found:", codeInput);
          }
        } catch (error) {
          console.error("Error fetching referral UID:", error);
        }
      }

      // 3️⃣ Save user to Firestore
      await setDoc(doc(db, "users", newUserUID), {
        id: newUserUID,
        name: form.fullName,
        username: form.username,
        email: form.email,
        package: "free",
        referralCode: generateReferralCode(form.username, newUserUID),
        referredBy: referredByUID,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Account created",
        description: "Welcome to Pall Network!",
      });

      navigate("/app/signin");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md space-y-4">
        <h2 className="text-2xl font-bold text-center">Sign Up</h2>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} />

          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" value={form.username} onChange={handleChange} />

          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} />

          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} />

          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} />

          <Label htmlFor="referralCode">Referral Code (Optional)</Label>
          <Input id="referralCode" name="referralCode" value={form.referralCode} onChange={handleChange} />
        </div>

        <Button onClick={handleSignUp} className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-2">
          Already have an account?{" "}
          <span className="text-blue-600 cursor-pointer" onClick={() => navigate("/app/signin")}>
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
}