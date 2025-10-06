import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDw76Wvqrckyz3jD7iscPHixaJ-I2M0r9Y",
  authDomain: "cropify-8e68d.firebaseapp.com",
  projectId: "cropify-8e68d",
  storageBucket: "cropify-8e68d.appspot.com",
  messagingSenderId: "781285242880",
  appId: "1:781285242880:web:b42465242f97da0adcc0e5",
  databaseURL: "https://cropify-8e68d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase (primary app)
const app = initializeApp(firebaseConfig);

// Initialize a secondary app for privileged actions (e.g., creating users)
// Using a named app prevents interfering with the primary auth session
let secondaryApp;
try {
  secondaryApp = initializeApp(firebaseConfig, 'Secondary');
} catch (e) {
  // If already initialized, reuse it
  // eslint-disable-next-line no-undef
  secondaryApp = window.firebase?.apps?.find?.(a => a.name === 'Secondary') || app;
}

const auth = getAuth(app);
const secondaryAuth = getAuth(secondaryApp);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);
const storage = getStorage(app);

export { app, auth, db, realtimeDb, secondaryAuth, storage };

