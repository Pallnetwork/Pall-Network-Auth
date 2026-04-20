import { useEffect, useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import Splash from "@/pages/Splash";
import SignIn from "@/pages/signin";
import SignUp from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import KYCPage from "@/pages/kyc";
import NotFound from "@/pages/not-found";
import AdminPanel from "@/pages/AdminPanel";
import PolicyFull from "@/pages/policyfull";

// 🔐 ADMIN UID
const ADMIN_UID = "Kyqy8Ra4qxfJxj4WdIB4a77BH172";

// =========================
// ADMIN ROUTE (FIXED)
// =========================
function AdminRoute() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <Splash />;

  if (!user) return <Redirect to="/app/signin" />;

  if (user.uid !== ADMIN_UID) return <Redirect to="/app/signin" />;

  return <AdminPanel />;
}

// =========================
// ROUTER
// =========================
function Router() {
  return (
    <Switch>
      {/* AUTH */}
      <Route path="/app/signin" component={SignIn} />
      <Route path="/app/signup" component={SignUp} />
      <Route path="/app/forgot-password" component={ForgotPassword} />

      {/* ADMIN */}
      <Route path="/admin" component={AdminRoute} />

      {/* POLICY */}
      <Route path="/app/policy-full" component={PolicyFull} />

      {/* DASHBOARD */}
      <Route path="/app/dashboard/:section?" component={Dashboard} />

      {/* KYC */}
      <Route path="/app/kyc" component={KYCPage} />

      {/* ROOT */}
      <Route path="/">
        <Redirect to="/app/signin" />
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// =========================
// APP
// =========================
function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken(true);
        localStorage.setItem("firebaseToken", token);
      } else {
        localStorage.removeItem("firebaseToken");
      }

      if (!user) {
        setLoading(true);
        setTimeout(() => setLoading(false), 1000);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />

          {loading && <Splash />}

          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;