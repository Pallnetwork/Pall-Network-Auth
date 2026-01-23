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

import { initialize } from 'react-native-google-mobile-ads';
initialize();

function Router() {
  return (
    <Switch>
      {/* AUTH */}
      <Route path="/app/signin" component={SignIn} />
      <Route path="/app/signup" component={SignUp} />
      <Route path="/app/forgot-password" component={ForgotPassword} />

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

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // 🔐 Token logic (tumhara existing)
      if (user) {
        const token = await user.getIdToken(true);
        localStorage.setItem("firebaseToken", token);
      } else {
        localStorage.removeItem("firebaseToken");
      }

      // 🌊 GLOBAL SPLASH (har auth change par)
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 1200); // ⏳ splash duration
    });

    return () => unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />

          {/* 🔥 GLOBAL SPLASH */}
          {loading && <Splash />}

          {/* APP */}
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
