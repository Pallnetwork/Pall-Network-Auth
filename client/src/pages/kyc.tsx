import { useEffect } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, CheckCircle } from "lucide-react";

export default function KYCPage() {
  const [, navigate] = useLocation();

  // Check if user is logged in using Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // User is not authenticated, redirect to signin
        navigate("/app/signin");
      }
    });
    
    // Cleanup the listener on unmount
    return () => unsubscribe();
  }, [navigate]);

  const handleBackToDashboard = () => {
    navigate("/app/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <div className="bg-green-600 text-white p-1.5 shadow-1g">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToDashboard}
            className="text-white hover:bg-green-700"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <img src="/logo192.png" alt="Pall Network" className="w-8 h-8 rounded-full" />
            <h1 className="text-xl font-bold">Pall Network</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                <Shield className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2" data-testid="heading-kyc-title">
              KYC Verification — Coming Soon
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Keep mining Pall Tokens! The Pall Network ecosystem is actively growing.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-6">
                KYC Verification will be launched soon for all users.
              </p>
              
              {/* Coming Soon Features */}
              <div className="grid gap-4 text-left bg-muted/50 p-6 rounded-lg">
                <h3 className="font-semibold text-center mb-4">What's Coming:</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-sm">Identity Verification</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-sm">Document Upload System</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-sm">Enhanced Security Features</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-sm">Faster Withdrawal Processing</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Continue mining while we prepare the KYC system for launch.
              </p>
              <Button 
                onClick={handleBackToDashboard}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-back-to-mining"
              >
                Back to Mining Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
