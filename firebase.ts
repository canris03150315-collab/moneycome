import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDeG5s2FKT5ZvowIw8tQmqvTHI3aeK2k_s",
  authDomain: "goodmoney666-jackpot.firebaseapp.com",
  projectId: "goodmoney666-jackpot",
  storageBucket: "goodmoney666-jackpot.appspot.com",
  messagingSenderId: "248630813908",
  appId: "1:248630813908:web:1e7cc138588b8dde3c8741"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
