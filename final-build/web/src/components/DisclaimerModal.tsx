import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, X } from "lucide-react";

export default function DisclaimerModal() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Show disclaimer on first visit or after updates
    const hasSeenDisclaimer = localStorage.getItem("pall-network-disclaimer");
    if (!hasSeenDisclaimer) {
      setShowModal(true);
    }
  }, []);

  const acceptDisclaimer = () => {
    localStorage.setItem("pall-network-disclaimer", "accepted");
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Important Disclaimer
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={acceptDisclaimer}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              ⚠️ Cloud Mining Simulation Notice
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              This app simulates cloud mining of PALL Token. No real device mining is performed.
              All mining activities are virtual and educational in nature.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Key Points:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Virtual token generation for educational purposes</li>
              <li>• No actual cryptocurrency mining occurs</li>
              <li>• USDT payments processed via blockchain wallets</li>
              <li>• Platform simulates mining economics and referral systems</li>
              <li>• All balances and rewards are within the app ecosystem</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Educational Platform:</strong> Pall Network is designed to teach users about 
              cryptocurrency mining, referral systems, and blockchain technology through gamification.
            </p>
          </div>

          <Button onClick={acceptDisclaimer} className="w-full">
            I Understand - Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}