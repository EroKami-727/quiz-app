// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch user data from Firestore
  async function fetchUserData(uid) {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role);
        setDisplayName(userData.displayName);
      } else {
        console.log("No user data found!");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }

  // Set up auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        // User is signed in, fetch their data
        fetchUserData(user.uid);
      } else {
        // User is signed out
        setUserRole(null);
        setDisplayName(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Create a user in Firestore after registration
  async function createUserProfile(uid, email, role, name) {
    try {
      await setDoc(doc(db, "users", uid), {
        email,
        role,
        displayName: name,
        createdAt: new Date().toISOString()
      });
      
      setUserRole(role);
      setDisplayName(name);
    } catch (error) {
      console.error("Error creating user profile:", error);
    }
  }

  const value = {
    currentUser,
    userRole,
    displayName,
    loading,
    createUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}


// Error Handling
function handleAuthError(error, operation) {
    // Log the error (consider using a proper logging service)
    console.error(`Authentication error during ${operation}:`, error);
    
    // Handle specific error codes
    switch(error.code) {
      case 'auth/too-many-requests':
        // Account has received too many login attempts
        return "Too many failed login attempts. Please try again later.";
      case 'auth/user-disabled':
        return "This account has been disabled.";
      default:
        return "An error occurred. Please try again.";
    }
  }