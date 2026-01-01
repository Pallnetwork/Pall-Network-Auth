import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, FileText, AlertTriangle, ArrowLeft } from "lucide-react";

interface PoliciesPageProps {
  onBack: () => void;
}

export default function PoliciesPage({ onBack }: PoliciesPageProps) {
  const [activeTab, setActiveTab] = useState("about");

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">About & Policies</h1>
        <p className="text-muted-foreground">Learn about Pall Network and our policies</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={activeTab === "about" ? "default" : "outline"}
          onClick={() => setActiveTab("about")}
          data-testid="tab-about"
        >
          <FileText className="w-4 h-4 mr-2" />
          About
        </Button>
        <Button
          variant={activeTab === "privacy" ? "default" : "outline"}
          onClick={() => setActiveTab("privacy")}
          data-testid="tab-privacy"
        >
          <Shield className="w-4 h-4 mr-2" />
          Privacy Policy
        </Button>
        <Button
          variant={activeTab === "terms" ? "default" : "outline"}
          onClick={() => setActiveTab("terms")}
          data-testid="tab-terms"
        >
          <FileText className="w-4 h-4 mr-2" />
          Terms of Service
        </Button>
        <Button
          variant={activeTab === "disclaimer" ? "default" : "outline"}
          onClick={() => setActiveTab("disclaimer")}
          data-testid="tab-disclaimer"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Disclaimer
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "about" && "About Pall Network"}
            {activeTab === "privacy" && "Privacy Policy"}
            {activeTab === "terms" && "Terms of Service"}
            {activeTab === "disclaimer" && "Important Disclaimer"}
          </CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          
          {/* About Tab */}
          {activeTab === "about" && (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3">What is Pall Network?</h3>
                <p>
                  Pall Network is an educational cloud mining simulation platform designed to teach users about 
                  cryptocurrency mining, blockchain technology, and referral systems through gamification.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Mining Simulation:</strong> Experience virtual mining with 24-hour cycles</li>
                  <li><strong>Referral System:</strong> Learn about network effects with F1 (5%) and F2 (2.5%) commission structures</li>
                  <li><strong>Wallet Integration:</strong> Practice with Web3 wallets like MetaMask and Trust Wallet</li>
                  <li><strong>Progressive Web App:</strong> Install on mobile devices for native app experience</li>
                  <li><strong>Educational Focus:</strong> All activities are simulated for learning purposes</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Technology Stack</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Frontend: React + TypeScript + Tailwind CSS</li>
                  <li>Backend: Firebase Authentication + Firestore Database</li>
                  <li>Blockchain: Ethereum/BSC wallet integration via ethers.js</li>
                  <li>PWA: Service Worker + Web App Manifest</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p><strong>Domain:</strong> pallnetworkcommerce.com</p>
                  <p><strong>Support:</strong> Available through app feedback system</p>
                  <p><strong>Version:</strong> 1.0.0 (Google Play & App Store Ready)</p>
                </div>
              </section>
            </div>
          )}

          {/* Privacy Policy Tab */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
              </p>

              <section>
                <h3 className="text-lg font-semibold mb-3">Information We Collect</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Information:</strong> Name, email, username when you create an account</li>
                  <li><strong>Wallet Data:</strong> Virtual balances and mining simulation progress</li>
                  <li><strong>Usage Data:</strong> App interaction patterns for improving user experience</li>
                  <li><strong>Device Information:</strong> Basic device info for PWA functionality</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">How We Use Your Information</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and maintain the mining simulation service</li>
                  <li>Process referral rewards and virtual transactions</li>
                  <li>Send service-related notifications</li>
                  <li>Improve app functionality and user experience</li>
                  <li>Ensure platform security and prevent abuse</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Data Security</h3>
                <p>
                  We use Firebase Authentication and Firestore with industry-standard encryption. 
                  Your password is securely hashed, and all data transmission is encrypted via HTTPS.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Third-Party Services</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Firebase:</strong> Google's backend services for authentication and data storage</li>
                  <li><strong>Web3 Wallets:</strong> MetaMask, Trust Wallet for optional USDT transactions</li>
                  <li><strong>Analytics:</strong> Basic usage analytics to improve the platform</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Your Rights</h3>
                <p>
                  You can access, update, or delete your account data at any time through the app settings. 
                  For data deletion requests, contact us through the app feedback system.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Children's Privacy</h3>
                <p>
                  Our service is not intended for users under 18 years old. We do not knowingly collect 
                  personal information from children under 18.
                </p>
              </section>
            </div>
          )}

          {/* Terms of Service Tab */}
          {activeTab === "terms" && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
              </p>

              <section>
                <h3 className="text-lg font-semibold mb-3">Acceptance of Terms</h3>
                <p>
                  By using Pall Network, you agree to these Terms of Service. If you do not agree, 
                  please do not use our service.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Service Description</h3>
                <p>
                  Pall Network is a <strong>simulation platform</strong> that provides educational experiences 
                  about cryptocurrency mining, blockchain technology, and network effects. All mining activities 
                  are virtual and for educational purposes only.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">User Responsibilities</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and truthful information during registration</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Use the service only for lawful and educational purposes</li>
                  <li>Not attempt to circumvent security measures or exploit the platform</li>
                  <li>Understand that all activities are simulated and educational</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Virtual Assets & Transactions</h3>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500">
                  <p className="font-medium">Important Notice:</p>
                  <ul className="mt-2 list-disc pl-6 space-y-1">
                    <li>PALL tokens are virtual and have no real-world monetary value</li>
                    <li>Mining rewards are simulated and educational in nature</li>
                    <li>USDT transactions occur through external wallet providers</li>
                    <li>We are not responsible for external wallet transaction failures</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Prohibited Activities</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Creating multiple accounts to exploit referral systems</li>
                  <li>Using bots or automated systems to interact with the platform</li>
                  <li>Attempting to hack, reverse engineer, or compromise platform security</li>
                  <li>Misrepresenting the platform as offering real cryptocurrency mining</li>
                  <li>Violating applicable laws or regulations</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Limitation of Liability</h3>
                <p>
                  Pall Network is provided "as is" without warranties. We are not liable for any 
                  damages arising from use of the platform, including but not limited to loss of 
                  virtual assets or failed external transactions.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">Termination</h3>
                <p>
                  We reserve the right to terminate accounts that violate these terms or engage 
                  in prohibited activities. Users may delete their accounts at any time.
                </p>
              </section>
            </div>
          )}

          {/* Disclaimer Tab */}
          {activeTab === "disclaimer" && (
            <div className="space-y-6">
              <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border-2 border-red-200 dark:border-red-800">
                <div className="flex items-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
                  <h3 className="text-xl font-bold text-red-700 dark:text-red-400">Important Legal Disclaimer</h3>
                </div>
                <p className="text-red-700 dark:text-red-300 font-medium">
                  This disclaimer must be read and understood before using Pall Network.
                </p>
              </div>

              <section>
                <h3 className="text-lg font-semibold mb-3">🎮 Simulation Platform Notice</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="font-medium mb-2">Pall Network is a SIMULATION platform that:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Provides educational experiences about cryptocurrency concepts</li>
                    <li>Does NOT perform actual cryptocurrency mining</li>
                    <li>Uses virtual tokens (PALL) with no real-world monetary value</li>
                    <li>Simulates mining economics for learning purposes only</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">💰 Not Financial Advice</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Nothing on this platform constitutes financial, investment, or trading advice</li>
                  <li>All content is for educational and informational purposes only</li>
                  <li>Consult qualified financial advisors before making investment decisions</li>
                  <li>Past simulated performance does not predict real-world results</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">🔒 Wallet Integration Disclaimer</h3>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Web3 wallet integration is optional and for package upgrades only</li>
                    <li>USDT transactions are processed through external wallet providers</li>
                    <li>We do not control or guarantee external blockchain transactions</li>
                    <li>Users are responsible for wallet security and transaction fees</li>
                    <li>Always verify transaction details before confirming payments</li>
                  </ul>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">⚖️ Legal Compliance</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>This platform complies with Google Play Store and App Store policies</li>
                  <li>We clearly distinguish between simulation and real cryptocurrency activities</li>
                  <li>All features are designed for educational purposes</li>
                  <li>Users must comply with their local laws and regulations</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">🌍 Geographic Restrictions</h3>
                <p>
                  This service may not be available in all jurisdictions. Users are responsible 
                  for ensuring compliance with their local laws regarding cryptocurrency simulations 
                  and educational platforms.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-3">📞 Contact & Support</h3>
                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                  <p>
                    If you have questions about this disclaimer or the platform's educational nature, 
                    please contact us through the app's feedback system. We are committed to transparency 
                    about our simulation-based approach.
                  </p>
                </div>
              </section>

              <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-green-700 dark:text-green-300 font-medium">
                  ✅ By using Pall Network, you acknowledge that you understand this is an educational 
                  simulation platform and agree to use it responsibly for learning purposes.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}