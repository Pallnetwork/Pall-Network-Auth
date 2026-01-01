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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Homepage} />
      <Route path="/app" component={Home} />
      <Route path="/app/signin" component={SignIn} />
      <Route path="/app/signup" component={SignUp} />
      <Route path="/app/forgot-password" component={ForgotPassword} />
      <Route path="/app/dashboard" component={Dashboard} />
      <Route path="/app/policies" component={() => <Dashboard />} />
      {/* Legacy routes redirect to /app */}
      <Route path="/signin" component={() => <Redirect to="/app/signin" />} />
      <Route path="/signup" component={() => <Redirect to="/app/signup" />} />
      <Route path="/dashboard" component={() => <Redirect to="/app/dashboard" />} />
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
