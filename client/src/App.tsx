import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";

import { auth } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import SignIn from "@/pages/signin";
import SignUp from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import KYCPage from "@/pages/kyc";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* AUTH */}
      <Route path="/app/signin" component={SignIn} />
      <Route path="/app/signup" component={SignUp} />
      <Route path="/app/forgot-password" component={ForgotPassword} />

      {/* MAIN DASHBOARD (ALL MENU PAGES INSIDE THIS) */}
      <Route path="/app/dashboard/:section?" component={Dashboard} />

      {/* KYC */}
      <Route path="/app/kyc" component={KYCPage} />

      {/* ROOT → DASHBOARD */}
      <Route path="/">
        <Redirect to="/app/dashboard" />
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken(true);

        console.log("🔥 FIREBASE ID TOKEN:", token);

        // Save for backend API calls
        localStorage.setItem("firebaseToken", token);
      } else {
        console.log("❌ User logged out");
        localStorage.removeItem("firebaseToken");
      }
    });

     return () => unsubscribe();
  }, []);

  async function mineForUser() {
  const user = auth.currentUser;
  if (!user) return console.error("User not logged in");

  // Firebase ID Token fetch
  const token = await user.getIdToken(true);

  // UID directly from user object
  const uid = user.uid;

  console.log("🔥 UID:", uid);
  console.log("🔥 Token:", token);

  // Backend call
  const response = await fetch("https://<YOUR-RENDER-URL>/api/mine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ userId: uid }),
  });

  const data = await response.json();
  console.log("💰 Backend response:", data);
}

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
