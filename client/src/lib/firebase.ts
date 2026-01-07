import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCs16TI4UyJiT8vE5c7mT0XhMa8l-cx1MU",
  authDomain: "pall-network-auth-7b89e.firebaseapp.com",
  projectId: "pall-network-auth-7b89e",
  storageBucket: "pall-network-auth-7b89e.firebasestorage.app",
  messagingSenderId: "469337844389",
  appId: "1:469337844389:web:e845cf532c3637a8927b4c",
  measurementId: "G-26FCXHBLWY",
};

// ✅ VERY IMPORTANT: prevent double init (Android fix)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// debug
console.log("🔥 Firebase initialized safely");