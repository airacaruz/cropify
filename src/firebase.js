import { getAnalytics, logEvent } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDw76Wvqrckyz3jD7iscPHixaJ-I2M0r9Y",
  authDomain: "cropify-8e68d.firebaseapp.com",
  projectId: "cropify-8e68d",
  storageBucket: "cropify-8e68d.appspot.com", // <-- FIXED: should be .appspot.com
  messagingSenderId: "781285242880",
  appId: "1:781285242880:web:b42465242f97da0adcc0e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const storage = getStorage(app);

export { analytics, app, auth, db, logEvent, storage };
