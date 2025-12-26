import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";

import SignIn from "@/pages/signin";
import SignUp from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import KYCPage from "@/pages/kyc";
import NotFound from "@/pages/not-found";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";

function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ✅ White screen fix (loader)
  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        Loading Pall Network...
      </div>
    );
  }

  return (
    <Switch>

      {/* Root */}
      <Route path="/">
        {user ? <Redirect to="/app/dashboard" /> : <Redirect to="/app/signin" />}
      </Route>

      {/* Auth */}
      <Route path="/app/signin">
        {user ? <Redirect to="/app/dashboard" /> : <SignIn />}
      </Route>

      <Route path="/app/signup">
        {user ? <Redirect to="/app/dashboard" /> : <SignUp />}
      </Route>

      <Route path="/app/forgot-password" component={ForgotPassword} />

      {/* Protected */}
      <Route path="/app/dashboard">
        {!user ? <Redirect to="/app/signin" /> : <Dashboard />}
      </Route>

      <Route path="/app/kyc">
        {!user ? <Redirect to="/app/signin" /> : <KYCPage />}
      </Route>

      {/* Legacy */}
      <Route path="/signin" component={() => <Redirect to="/app/signin" />} />
      <Route path="/signup" component={() => <Redirect to="/app/signup" />} />
      <Route path="/dashboard" component={() => <Redirect to="/app/dashboard" />} />

      {/* Fallback */}
      <Route component={NotFound} />

    </Switch>
  );
}

function App() {
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
