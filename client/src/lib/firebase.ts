import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCs16TI4UyJiT8vE5c7mT0XhMa8l-cx1MU",
  authDomain: "pall-network-auth-7b89e.firebaseapp.com",
  projectId: "pall-network-auth-7b89e",
  storageBucket: "pall-network-auth-7b89e.firebasestorage.app",
  messagingSenderId: "469337844389",
  appId: "1:469337844389:web:e845cf532c3637a8927b4c",
  measurementId: "G-26FCXHBLWY",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Set Firebase Auth to use browserLocalPersistence for persistent sessions
// This ensures users stay logged in across browser refreshes and app reopens
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting Firebase Auth persistence:', error);
});
