import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: "stellar-axon-g7854.firebaseapp.com",
  projectId: "stellar-axon-g7854",
  storageBucket: "stellar-axon-g7854.firebasestorage.app",
  messagingSenderId: "310078353953",
  appId: "1:310078353953:web:5586d8abea2258602c2960"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

