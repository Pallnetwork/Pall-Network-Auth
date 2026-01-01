import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { distributeReferralCommission } from "@/lib/referralCommission";

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Default packages - will be overridden by Firebase settings
const DEFAULT_PACKAGES = [
  { name: "Bronze", price: 5, speed: 3, audience: "Beginners / Entry users" },
  { name: "Silver", price: 8, speed: 7, audience: "Regular miners" },
  { name: "Gold", price: 49, speed: 15, audience: "Semi-Pro miners" },
  { name: "Diamond", price: 100, speed: 22, audience: "Pro miners / Investors" },
];

const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // BEP20 USDT Contract
const RECEIVER_ADDRESS = "0xAaE232DeFc1a7951C6b8a00EC46C6d451f605cCF";

interface UpgradePageProps {
  userId: string;
}

export default function UpgradePage({ userId }: UpgradePageProps) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load settings from Firebase
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "config"));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          if (settings.packages) {
            const firebasePackages = Object.entries(settings.packages).map(([name, config]: [string, any]) => ({
              name,
              price: config.price,
              speed: config.speed,
              audience: name === "Bronze" ? "Beginners / Entry users" : 
                       name === "Silver" ? "Regular miners" :
                       name === "Gold" ? "Semi-Pro miners" : "Pro miners / Investors"
            }));
            setPackages(firebasePackages);
          }
        } else {
          // Initialize settings if they don't exist
          await setDoc(doc(db, "settings", "config"), {
            mining: { baseRate: 1 / (24 * 60 * 60) }, // Exactly 1 PALL per 24 hours
            referral: { f1: 0.05, f2: 0.025 },
            packages: {
              Bronze: { price: 3, speed: 2 },
              Silver: { price: 10, speed: 6 },
              Gold: { price: 50, speed: 15 },
              Diamond: { price: 120, speed: 25 }
            }
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Detect installed wallets
  const detectWallet = () => {
    if (window.ethereum) {
      if (window.ethereum.isMetaMask) return "MetaMask";
      if (window.ethereum.isTrust) return "Trust Wallet";
      if (window.ethereum.isCoinbaseWallet) return "Coinbase Wallet";
      return "Web3 Wallet";
    }
    return null;
  };

  // Auto-connect if wallet already connected
  useEffect(() => {
    const autoConnect = async () => {
      // Check if we're on a secure context (https or localhost)
      if (!window.isSecureContext && !window.location.hostname.includes('localhost')) {
        console.warn("Wallet connection requires secure context (HTTPS)");
        return;
      }

      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          // Check if already connected (permissions granted)
          const permissions = await window.ethereum.request({
            method: 'wallet_getPermissions',
          });
          
          if (permissions.length > 0) {
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) {
              setWallet(accounts[0].address);
              console.log("✅ Auto-connected to wallet:", accounts[0].address);
            }
          }
        } catch (error) {
          console.log("Auto-connect check failed:", error);
        }
      }
    };
    autoConnect();
  }, []);

  // Connect Wallet (MetaMask / Web3 Provider)
  const connectWallet = async () => {
    try {
      // Check if we're on a secure context
      if (!window.isSecureContext && !window.location.hostname.includes('localhost')) {
        toast({
          title: "Secure Connection Required",
          description: "Wallet connection requires HTTPS. Please use a secure connection.",
          variant: "destructive",
        });
        return;
      }

      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Request account access with proper error handling
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        if (accounts && accounts.length > 0) {
          setWallet(accounts[0]);
          const walletName = detectWallet();
          
          console.log("✅ Wallet connected successfully:", accounts[0]);
          
          toast({
            title: "Wallet Connected",
            description: `${walletName} connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
          });
        } else {
          throw new Error("No accounts returned");
        }
      } else {
        // Enhanced wallet detection for mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        toast({
          title: "No Web3 Wallet Found",
          description: isMobile 
            ? "Please use a Web3 browser like Trust Wallet or MetaMask mobile app."
            : "Please install MetaMask, Trust Wallet, or another Web3 wallet extension.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      
      let errorMessage = "Failed to connect wallet. Please try again.";
      
      if (error.code === 4001) {
        errorMessage = "Connection request was rejected. Please approve the connection in your wallet.";
      } else if (error.code === -32002) {
        errorMessage = "Connection request already pending. Please check your wallet.";
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Update mining package in Firestore and record transaction
  const updateMining = async (userId: string, pkg: typeof packages[0], txHash: string) => {
    try {
      // Update wallet with new package
      await setDoc(doc(db, "wallets", userId), {
        currentPackage: pkg.name,
        miningSpeed: pkg.speed,
        packagePrice: pkg.price,
        upgradedAt: new Date()
      }, { merge: true });

      // Record transaction in transactions collection
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await setDoc(doc(db, "transactions", transactionId), {
        userId: userId,
        package: pkg.name,
        amount: pkg.price,
        speed: pkg.speed,
        txHash: txHash,
        status: "confirmed",
        network: "BEP20",
        createdAt: new Date()
      });

    } catch (error) {
      console.error("Error updating mining package:", error);
    }
  };

  // Buy Package
  const buyPackage = async (pkg: typeof packages[0]) => {
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
      const receipt = await tx.wait();

      toast({
        title: "Package Purchased!",
        description: `${pkg.name} Package - Speed upgraded to ${pkg.speed}X`,
      });

      // Save package to Firestore with transaction hash
      await updateMining(userId, pkg, tx.hash);

      // Distribute referral commissions
      const commissionResult = await distributeReferralCommission(userId, pkg.price);
      if (commissionResult && commissionResult.success) {
        console.log(`💰 Commissions distributed - F1: ${commissionResult.f1Commission || 0}, F2: ${commissionResult.f2Commission || 0}`);
      } else if (commissionResult && !commissionResult.success) {
        console.error("Commission distribution failed:", commissionResult.error);
      }

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

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading packages...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg, i) => (
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
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>⚠️ Payment accepted only in USDT (BEP20) on BNB Smart Chain.</p>
          <p>Once purchased, packages cannot be changed.</p>
          <p>Mining speed multiplier applies to base rate of 1 PALL per 24 hours (≈0.0000116 PALL/second).</p>
        </div>
      </CardContent>
    </Card>
  );
}