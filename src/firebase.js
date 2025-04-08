// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA1kFn2qxjR9XoVn7y4O40_WMSLkrRrJY0",
  authDomain: "quiz-app-4a643.firebaseapp.com",
  projectId: "quiz-app-4a643",
  storageBucket: "quiz-app-4a643.firebasestorage.app",
  messagingSenderId: "268934922894",
  appId: "1:268934922894:web:2ad465ea5fedc71363ffdf",
  measurementId: "G-N03YLSWET1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);