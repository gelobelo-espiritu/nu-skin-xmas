import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAVAndJ9HxJVRX6xNDof2bj474rDp0eQe8",
  authDomain: "nu-skin-xmas-party.firebaseapp.com",
  projectId: "nu-skin-xmas-party",
  storageBucket: "nu-skin-xmas-party.appspot.com",
  messagingSenderId: "820472322224",
  appId: "1:820472322224:web:c68ab19c0fdcfadd72c375",
  measurementId: "G-24YZD884MZ",
};

// Initialize Firebase
initializeApp(firebaseConfig);
const db = getFirestore();

export default db;
