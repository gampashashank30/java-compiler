import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCvYpYfpUf3uyu2BEWwB75HnK2SVTRCD3c",
  authDomain: "login-system-for-java-compiler.firebaseapp.com",
  projectId: "login-system-for-java-compiler",
  storageBucket: "login-system-for-java-compiler.firebasestorage.app",
  messagingSenderId: "110792492124",
  appId: "1:110792492124:web:4f034f94351d1fdbf79299"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
