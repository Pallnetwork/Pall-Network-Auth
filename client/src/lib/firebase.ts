import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAxLwNUXdbnk0l2rzBMh4DLwE5tteztvUg",
  authDomain: "pall-network-494ae.firebaseapp.com",
  projectId: "pall-network-494ae",
  storageBucket: "pall-network-494ae.firebasestorage.app",
  messagingSenderId: "785443894438",
  appId: "1:785443894438:web:828a9e4b1ff114eff4b067"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);