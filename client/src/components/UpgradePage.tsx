import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Heart } from "lucide-react";

const RECEIVER_ADDRESS = "0xAaE232DeFc1a7951C6b8a00EC46C6d451f605cCF";

interface UpgradePageProps {
  userId: string;
}

export default function UpgradePage({ userId }: UpgradePageProps) {
  const { toast } = useToast();

  // Copy wallet address to clipboard
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Wallet address copied!",
        description: "Address copied to clipboard successfully.",
      });
    } catch (error) {
      console.error("Failed to copy address:", error);
      toast({
        title: "Copy failed",
        description: "Could not copy address to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardContent className="space-y-6 pt-6">
        {/* Support Section */}
        <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">Support Pall Network</h3>
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pall Network is growing with your support!<br />
              Every contribution helps us maintain and improve the mining ecosystem.<br />
              You can support us by sending USDT (BEP20) directly to our support wallet.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
              <p className="text-sm text-muted-foreground mb-2">Support Wallet Address:</p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200 break-all bg-gray-100 dark:bg-gray-700 p-3 rounded border">
                    {RECEIVER_ADDRESS}
                  </p>
                </div>
                <Button
                  onClick={() => copyToClipboard(RECEIVER_ADDRESS)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 hover:bg-red-50 hover:border-red-300 shrink-0"
                  data-testid="button-copy-support-address"
                >
                  <Copy className="w-4 h-4" />
                  Copy Address
                </Button>
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-2">
                <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-1"></span>
                BNB Chain — BEP20 Network Only
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                💝 Thank you for supporting the Pall Network community!
              </p>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}