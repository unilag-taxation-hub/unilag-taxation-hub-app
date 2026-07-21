import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAyO4gaFoFATFqG1R5GrfcpEW74v7XPuec",
  authDomain: "unilag-taxation-hub.firebaseapp.com",
  projectId: "unilag-taxation-hub",
  storageBucket: "unilag-taxation-hub.firebasestorage.app",
  messagingSenderId: "555125020334",
  appId: "1:555125020334:web:a6902a95bafa3c9643bf3f",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);