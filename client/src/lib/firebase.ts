import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCs16TI4UyJiT8vE5c7mT0XhMa8l-cx1MU",
  authDomain: "pall-network-auth-7b89e.firebaseapp.com",
  projectId: "pall-network-auth-7b89e",
  storageBucket: "pall-network-auth-7b89e.firebasestorage.app",
  messagingSenderId: "469337844389",
  appId: "1:469337844389:web:e845cf532c3637a8927b4c",
  measurementId: "G-26FCXHBLWY",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Firestore reference
export const db = getFirestore(app);

// ✅ Auth reference
export const auth = getAuth(app);

// ✅ Ensure persistence (user stays logged in after refresh / reopen)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("🔥 Firebase Auth persistence set to browserLocalPersistence");
  })
  .catch((error) => {
    console.error("❌ Error setting Firebase Auth persistence:", error);
  }); 
