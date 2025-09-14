import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sun, Smartphone, Shield, Zap, Download, ExternalLink, FileText, Users, Clock, Coins } from "lucide-react";
// Using public path for the icon since it's already in public folder
const appIconPath = "/logo192.png";

export default function Homepage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={appIconPath} alt="Pall Network Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold">Pall Network</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              data-testid="theme-toggle"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Link href="/app">
              <Button data-testid="button-launch-app">Launch App</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-20">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-primary to-blue-600 mb-8 shadow-2xl overflow-hidden">
            <img src={appIconPath} alt="Pall Network Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Pall Network
          </h1>
          <p className="text-2xl text-muted-foreground mb-4 font-medium">
            Web3 Mining Simulation
          </p>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12">
            Experience the future of decentralized mining with our educational crypto simulation platform. 
            Mine virtual tokens, connect your wallet, and learn Web3 technologies in a safe environment.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/app">
              <Button size="lg" className="text-lg px-8 py-4" data-testid="button-start-mining">
                🚀 Start Mining Now
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4" onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Learn More
            </Button>
          </div>
        </section>

        {/* About Section */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">About Pall Network Commerce</h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto">
              We are pioneering the future of blockchain education through immersive mining simulations. 
              Our platform combines cutting-edge Web3 technology with user-friendly design to make 
              cryptocurrency and mining accessible to everyone.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-primary/20">
              <CardContent className="pt-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">10,000+ Miners</h3>
                <p className="text-muted-foreground">Join our growing community of crypto enthusiasts and learners</p>
              </CardContent>
            </Card>
            <Card className="text-center border-primary/20">
              <CardContent className="pt-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Coins className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">500K+ PALL Mined</h3>
                <p className="text-muted-foreground">Tokens mined through our educational simulation platform</p>
              </CardContent>
            </Card>
            <Card className="text-center border-primary/20">
              <CardContent className="pt-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">24/7 Mining</h3>
                <p className="text-muted-foreground">Continuous mining cycles with real-time balance updates</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Platform Features</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive Web3 mining simulation with real wallet integration and cross-platform support
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-500 mb-4 flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Mining Simulation</h3>
                <p className="text-muted-foreground">
                  24-hour mining cycles earning exactly 1 PALL token per session. Learn mining mechanics safely.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 text-green-500 mb-4 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Wallet Integration</h3>
                <p className="text-muted-foreground">
                  Connect MetaMask, Trust Wallet, and other Web3 wallets. Support for USDT BEP20 transactions.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 text-purple-500 mb-4 flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">PWA + Mobile Support</h3>
                <p className="text-muted-foreground">
                  Progressive Web App with offline support, push notifications, and native mobile apps.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 text-orange-500 mb-4 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Referral System</h3>
                <p className="text-muted-foreground">
                  Multi-level referral program to grow your network and earn bonus mining rewards.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-red-500/10 text-red-500 mb-4 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Real-time Updates</h3>
                <p className="text-muted-foreground">
                  Live balance tracking, countdown timers, and instant mining status updates.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-teal-500/10 text-teal-500 mb-4 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Secure & Educational</h3>
                <p className="text-muted-foreground">
                  Firebase-secured authentication and educational content for safe crypto learning.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Download Links Section */}
        <section className="py-20 bg-muted/30 rounded-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Get the App</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Access Pall Network on any device with our cross-platform applications
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <ExternalLink className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                <h3 className="font-semibold mb-2">Web App</h3>
                <p className="text-sm text-muted-foreground mb-4">Access directly in your browser</p>
                <Link href="/app">
                  <Button variant="outline" size="sm" className="w-full">
                    Launch Web App
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Download className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="font-semibold mb-2">PWA Install</h3>
                <p className="text-sm text-muted-foreground mb-4">Install as native app</p>
                <Button variant="outline" size="sm" className="w-full" onClick={() => {
                  // Trigger PWA install prompt
                  if ('serviceWorker' in navigator) {
                    alert('Click the install button in your browser address bar to install the PWA!');
                  }
                }}>
                  Install PWA
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow border-2 border-green-500/20">
              <CardContent className="pt-6">
                <Download className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="font-semibold mb-2 text-green-600">Android APK</h3>
                <p className="text-sm text-muted-foreground mb-2">Native Android application</p>
                <p className="text-xs text-green-600 font-medium mb-4">✓ Available Now • v1.0.0</p>
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => {
                  // Create a download link for the APK
                  const link = document.createElement('a');
                  link.href = '/pall-network-v1.0.0.apk'; // This would be the actual APK file
                  link.download = 'pall-network-v1.0.0.apk';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }} data-testid="button-download-android-apk">
                  <Download className="w-4 h-4 mr-2" />
                  Download APK
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow opacity-60">
              <CardContent className="pt-6">
                <Smartphone className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <h3 className="font-semibold mb-2">iOS App</h3>
                <p className="text-sm text-muted-foreground mb-4">Coming to App Store</p>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Policies Section */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Legal & Policies</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Transparent policies and compliance information for your peace of mind
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <FileText className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                <h3 className="font-semibold mb-2">Privacy Policy</h3>
                <p className="text-sm text-muted-foreground mb-4">How we protect your data</p>
                <Link href="/app/policies?tab=privacy">
                  <Button variant="outline" size="sm" className="w-full">
                    Read Policy
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="font-semibold mb-2">Terms of Service</h3>
                <p className="text-sm text-muted-foreground mb-4">Platform usage guidelines</p>
                <Link href="/app/policies?tab=terms">
                  <Button variant="outline" size="sm" className="w-full">
                    Read Terms
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <ExternalLink className="w-12 h-12 mx-auto mb-4 text-orange-500" />
                <h3 className="font-semibold mb-2">Legal Disclaimer</h3>
                <p className="text-sm text-muted-foreground mb-4">Important legal information</p>
                <Link href="/app/policies?tab=disclaimer">
                  <Button variant="outline" size="sm" className="w-full">
                    Read Disclaimer
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Blog/Updates Section */}
        <section className="py-20 bg-muted/30 rounded-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Latest Updates</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Stay informed about platform developments, mining opportunities, and Web3 education content
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-4 flex items-center justify-center">
                  <Zap className="w-12 h-12 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Platform Launch</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Pall Network officially launches with 24-hour mining cycles and Web3 wallet integration.
                </p>
                <p className="text-xs text-blue-600 font-medium">January 2025</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-full h-40 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg mb-4 flex items-center justify-center">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Referral System</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Multi-level referral program coming soon to boost your mining rewards and network growth.
                </p>
                <p className="text-xs text-green-600 font-medium">Coming Soon</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-full h-40 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg mb-4 flex items-center justify-center">
                  <Smartphone className="w-12 h-12 text-white" />
                </div>
                <h3 className="font-semibold mb-2">Mobile Apps</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Native Android and iOS applications in development for enhanced mobile mining experience.
                </p>
                <p className="text-xs text-orange-600 font-medium">Q2 2025</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <img src={appIconPath} alt="Pall Network Logo" className="w-8 h-8 rounded-lg" />
              <h3 className="text-lg font-bold">Pall Network Commerce</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Educational Web3 Mining Simulation Platform
            </p>
            <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
              <Link href="/app/policies?tab=privacy" className="hover:text-primary">Privacy Policy</Link>
              <Link href="/app/policies?tab=terms" className="hover:text-primary">Terms of Service</Link>
              <Link href="/app/policies?tab=disclaimer" className="hover:text-primary">Disclaimer</Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              © 2025 Pall Network Commerce. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}