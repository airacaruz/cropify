// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";



import { getAnalytics, logEvent } from "firebase/analytics"; // ✅ FIXED

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDw76Wvqrckyz3jD7iscPHixaJ-I2M0r9Y",
  authDomain: "cropify-8e68d.firebaseapp.com",
  projectId: "cropify-8e68d",
  storageBucket: "cropify-8e68d.firebasestorage.app",
  messagingSenderId: "781285242880",
  appId: "1:781285242880:web:b42465242f97da0adcc0e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app); // ✅ Works now

// Exports
export { app, db, auth, analytics, logEvent };

export const storage = getStorage(app);

