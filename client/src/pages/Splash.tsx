// client/src/pages/Splash.tsx

import { useEffect } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import logo from "@/assets/logo.png";

export default function Splash() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = auth.currentUser;
      if (user) {
        navigate("/app/dashboard", { replace: true });
      } else {
        navigate("/app/signin", { replace: true });
      }
    }, 2000); // 2 sec splash

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      <div className="flex flex-col items-center space-y-4">
        <img
          src={logo}
          alt="Pall Network Logo"
          className="w-20 h-20 object-contain animate-pulse"
        />
        <h1 className="text-3xl font-bold text-white text-center">
          Welcome to Pall Network
        </h1>
        <p className="text-white/70 text-center">
          Digital Network Platform
        </p>
      </div>
    </div>
  );
}