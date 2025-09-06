import React, { useState } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const PACKAGES = [
  { name: "Bronze", price: 3, speed: 2, audience: "Beginners / Entry users" },
  { name: "Silver", price: 10, speed: 6, audience: "Regular miners" },
  { name: "Gold", price: 50, speed: 15, audience: "Semi-Pro miners" },
  { name: "Diamond", price: 120, speed: 25, audience: "Pro miners / Investors" },
];

const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // BEP20 USDT Contract
const RECEIVER_ADDRESS = "0xAaE232DeFc1a7951C6b8a00EC46C6d451f605cCF";

interface UpgradePageProps {
  userId: string;
}

export default function UpgradePage({ userId }: UpgradePageProps) {
  const [wallet, setWallet] = useState<string | null>(null);
  const { toast } = useToast();

  // Connect Wallet (MetaMask / Web3 Provider)
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setWallet(accounts[0]);
        toast({
          title: "Wallet Connected",
          description: `Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
      } else {
        toast({
          title: "No Wallet Found",
          description: "Please install MetaMask or Trust Wallet.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update mining package in Firestore
  const updateMining = async (userId: string, pkg: typeof PACKAGES[0]) => {
    try {
      await setDoc(doc(db, "wallets", userId), {
        currentPackage: pkg.name,
        miningSpeed: pkg.speed,
        packagePrice: pkg.price,
        upgradedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating mining package:", error);
    }
  };

  // Buy Package
  const buyPackage = async (pkg: typeof PACKAGES[0]) => {
    try {
      if (!wallet) {
        toast({
          title: "Wallet Required",
          description: "Please connect your wallet first!",
          variant: "destructive",
        });
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // ERC20 Transfer (USDT on BNB Chain)
      const usdt = new ethers.Contract(
        USDT_ADDRESS,
        ["function transfer(address to, uint256 amount) public returns (bool)"],
        signer
      );

      const amount = ethers.parseUnits(pkg.price.toString(), 18); // USDT 18 decimals
      
      toast({
        title: "Processing Transaction",
        description: "Please confirm the transaction in your wallet...",
      });

      const tx = await usdt.transfer(RECEIVER_ADDRESS, amount);
      await tx.wait();

      toast({
        title: "Package Purchased!",
        description: `${pkg.name} Package - Speed upgraded to ${pkg.speed}X`,
      });

      // Save package to Firestore
      await updateMining(userId, pkg);

    } catch (error: any) {
      console.error("Transaction error:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Transaction failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">Upgrade Mining</h2>
      </CardHeader>
      <CardContent className="space-y-6">
        {!wallet ? (
          <div className="text-center">
            <Button
              onClick={connectWallet}
              className="bg-blue-500 hover:bg-blue-600"
              data-testid="button-connect-wallet"
            >
              Connect Wallet
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-green-600 font-medium">
              Wallet Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PACKAGES.map((pkg, i) => (
            <Card key={i} className="border-2 hover:border-primary transition-colors">
              <CardContent className="p-4 text-center">
                <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                <p className="text-2xl font-bold text-green-600 mb-1">{pkg.price} USDT</p>
                <p className="text-sm font-semibold text-blue-600 mb-2">
                  {pkg.speed}X Mining Speed
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {pkg.audience}
                </p>
                <Button
                  onClick={() => buyPackage(pkg)}
                  className="w-full bg-green-500 hover:bg-green-600"
                  data-testid={`button-buy-${pkg.name.toLowerCase()}`}
                >
                  Buy Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>⚠️ Payment accepted only in USDT (BEP20) on BNB Smart Chain.</p>
          <p>Once purchased, packages cannot be changed.</p>
          <p>Mining speed multiplier applies to base rate of 0.01 PALL/second.</p>
        </div>
      </CardContent>
    </Card>
  );
}