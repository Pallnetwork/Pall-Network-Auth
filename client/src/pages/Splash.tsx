import { useEffect } from "react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import logo from "@/assets/logo.png";

export default function Splash() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          navigate("/app/dashboard");
        } else {
          navigate("/app/signin");
        }
        unsubscribe();
      });
    }, 1500); // ⏳ 1.5 sec splash

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-900">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl px-8 py-10 flex flex-col items-center shadow-xl">
        <img
          src={logo}
          alt="Pall Network"
          className="w-24 h-24 mb-6"
        />

        <p className="text-white text-lg">Welcome to</p>
        <h1 className="text-white text-2xl font-bold">Pall Network</h1>
        <p className="text-white/80 text-sm mt-1">
          Digital Network Platform
        </p>

        {/* Loading Spinner */}
        <div className="mt-6 w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}
