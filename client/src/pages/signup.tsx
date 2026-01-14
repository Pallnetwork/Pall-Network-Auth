import { useState } from "react"; import { useLocation } from "wouter"; import { auth, db } from "@/lib/firebase"; import { createUserWithEmailAndPassword } from "firebase/auth"; import { doc, setDoc, getDocs, query, collection, where } from "firebase/firestore"; import { useToast } from "@/hooks/use-toast";

interface User { id: string; name: string; username: string; email: string; referredBy?: string; package?: string; }

export default function Signup() { const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "", confirmPassword: "", referralCode: "" }); const [loading, setLoading] = useState(false); const { toast } = useToast(); const [, navigate] = useLocation(); // wouter compatible

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setForm({ ...form, [e.target.name]: e.target.value }); };

const handleSignup = async () => { if (form.password !== form.confirmPassword) { toast({ title: "Error", description: "Passwords do not match", variant: "destructive" }); return; }

setLoading(true);
try {
  // Create user in Firebase Auth
  const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
  const uid = userCred.user.uid;

  let referredByUID: string | null = null;

  if (form.referralCode.trim() !== "") {
    // Fetch the user with that referral code
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referralCode", "==", form.referralCode));
    const snap = await getDocs(q);
    if (!snap.empty) {
      referredByUID = snap.docs[0].id; // ✅ UID only
    } else {
      referredByUID = null; // invalid referral, ignore
    }
  }

  // Save user document in Firestore
  await setDoc(doc(db, "users", uid), {
    id: uid,
    name: form.fullName,
    username: form.username,
    email: form.email,
    package: "free",
    referredBy: referredByUID || null,
    createdAt: new Date(),
    referralCode: `${form.username}-${uid.slice(0,5)}` // generate referral code
  });

  toast({ title: "Success", description: "Account created successfully" });
  navigate("/app/dashboard");
} catch (error: any) {
  console.error("Signup error:", error);
  toast({ title: "Error", description: error.message || "Failed to create account", variant: "destructive" });
} finally {
  setLoading(false);
}

};

return ( <div className="max-w-md mx-auto p-6 space-y-4"> <h2 className="text-2xl font-bold text-center">Create Account</h2> <input type="text" name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} className="input" /> <input type="text" name="username" placeholder="Username" value={form.username} onChange={handleChange} className="input" /> <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="input" /> <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="input" /> <input type="password" name="confirmPassword" placeholder="Confirm Password" value={form.confirmPassword} onChange={handleChange} className="input" /> <input type="text" name="referralCode" placeholder="Referral Code (optional)" value={form.referralCode} onChange={handleChange} className="input" /> <button onClick={handleSignup} disabled={loading} className="btn w-full">{loading ? "Creating..." : "Create Account"}</button> </div> ); }