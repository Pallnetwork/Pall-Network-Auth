import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Zap } from "lucide-react";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  createdAt: any;
  invitation?: string;
  referralCode?: string;
  referredBy?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      navigate("/signin");
      return;
    }

    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          localStorage.removeItem("userId");
          navigate("/signin");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        localStorage.removeItem("userId");
        navigate("/signin");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/signin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Dashboard</h2>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            
            {/* Welcome Section */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 mb-4 shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-2">Welcome to Pall Network! 🚀</h3>
              <p className="text-muted-foreground">You're successfully authenticated and ready to explore.</p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* User Info Card */}
            <div className="bg-muted/30 rounded-lg p-6">
              <h4 className="font-semibold mb-4">Account Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span data-testid="text-name">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username:</span>
                  <span data-testid="text-username">@{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span data-testid="text-email">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member since:</span>
                  <span data-testid="text-created-at">{formatDate(user.createdAt)}</span>
                </div>
                {user.referralCode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Referral Code:</span>
                    <span data-testid="text-referral-code" className="font-mono bg-muted px-2 py-1 rounded text-sm">
                      {user.referralCode}
                    </span>
                  </div>
                )}
                {user.referredBy && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referred by:</span>
                    <span data-testid="text-referred-by">@{user.referredBy}</span>
                  </div>
                )}
                {user.invitation && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used Invitation:</span>
                    <span data-testid="text-invitation">{user.invitation}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <Button
                variant="secondary"
                className="w-full"
                data-testid="button-profile-settings"
              >
                View Profile Settings
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                data-testid="button-network-activity"
              >
                Network Activity
              </Button>
            </div>

            {/* Logout Button */}
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
