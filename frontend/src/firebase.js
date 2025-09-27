// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBjMlScczZr750GK8Vp_52ZVLTdIoir9uY",
  authDomain: "auth-ef08b.firebaseapp.com",
  projectId: "auth-ef08b",
  storageBucket: "auth-ef08b.firebasestorage.app",
 messagingSenderId: "989101932110",
  appId: "1:989101932110:web:b56aaf549335d3e3af4d1f"

};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
