import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Homepage from "@/pages/homepage";
import Home from "@/pages/home";
import SignIn from "@/pages/signin";
import SignUp from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import KYCPage from "@/pages/kyc";
import NotFound from "@/pages/not-found";

function Router() {
  // Check if this is Android app user
  const isAndroidApp = /PallNetworkApp/i.test(navigator.userAgent);
  
  return (
    <Switch>
      <Route path="/" component={() => {
        // For Android app users, redirect directly to signin
        if (isAndroidApp) {
          return <Redirect to="/app/signin" />;
        }
        return <Homepage />;
      }} />
      <Route path="/app" component={Home} />
      <Route path="/app/signin" component={SignIn} />
      <Route path="/app/signup" component={SignUp} />
      <Route path="/app/forgot-password" component={ForgotPassword} />
      <Route path="/app/dashboard" component={Dashboard} />
      <Route path="/app/dashboard/profile" component={Dashboard} />
      <Route path="/app/dashboard/referral" component={Dashboard} />
      <Route path="/app/dashboard/wallet" component={Dashboard} />
      <Route path="/app/dashboard/upgrade" component={Dashboard} />
      <Route path="/app/dashboard/policies" component={Dashboard} />
      <Route path="/app/kyc" component={KYCPage} />
      {/* Legacy routes redirect to /app */}
      <Route path="/signin" component={() => <Redirect to="/app/signin" />} />
      <Route path="/signup" component={() => <Redirect to="/app/signup" />} />
      <Route path="/dashboard" component={() => <Redirect to="/app/dashboard" />} />
      <Route path="/forgot-password" component={() => <Redirect to="/app/forgot-password" />} />
      <Route path="/kyc" component={() => <Redirect to="/app/kyc" />} />
      {/* Fallback for unknown routes - redirect to signin for Android, 404 for web */}
      <Route component={() => {
        if (isAndroidApp) {
          return <Redirect to="/app/signin" />;
        }
        return <NotFound />;
      }} />
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
