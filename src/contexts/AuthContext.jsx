// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

// Maximum session duration in milliseconds (e.g., 7 days = 604800000 ms)
const MAX_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; 

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiry, setSessionExpiry] = useState(null);

  // Function to check if the session is expired
  const isSessionExpired = () => {
    const expiry = localStorage.getItem('sessionExpiry');
    if (!expiry) return false;
    
    return new Date().getTime() > parseInt(expiry);
  };

  // Function to update session expiry
  const updateSessionExpiry = () => {
    const expiryTime = new Date().getTime() + MAX_SESSION_DURATION;
    localStorage.setItem('sessionExpiry', expiryTime.toString());
    setSessionExpiry(expiryTime);
  };

  // Function to fetch user data from Firestore
  async function fetchUserData(uid) {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role);
        setDisplayName(userData.displayName);
        
        // Update last active timestamp
        await updateDoc(userDocRef, {
          lastActive: new Date().toISOString()
        });

        // Set/update session expiry
        updateSessionExpiry();
      } else {
        console.log("No user data found!");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }

  // Check for session expiry and handle auto-logout
  useEffect(() => {
    const checkSession = () => {
      if (currentUser && isSessionExpired()) {
        console.log("Session expired, logging out...");
        handleSignOut();
      }
    };

    checkSession();
    
    // Set up interval to check session status periodically
    const interval = setInterval(checkSession, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [currentUser, sessionExpiry]);

  // Handle user activity to extend session
  useEffect(() => {
    if (!currentUser) return;

    const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    
    const handleUserActivity = () => {
      updateSessionExpiry();
    };
    
    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });
    
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [currentUser]);

  // Function to handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('sessionExpiry');
      setSessionExpiry(null);
      setUserRole(null);
      setDisplayName(null);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

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
        localStorage.removeItem('sessionExpiry');
        setSessionExpiry(null);
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
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      });
      
      setUserRole(role);
      setDisplayName(name);
      updateSessionExpiry();
    } catch (error) {
      console.error("Error creating user profile:", error);
    }
  }

  const value = {
    currentUser,
    userRole,
    displayName,
    loading,
    createUserProfile,
    signOut: handleSignOut,
    sessionExpiry,
    updateSessionExpiry
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Error Handling
export function handleAuthError(error, operation) {
  // Log the error (consider using a proper logging service)
  console.error(`Authentication error during ${operation}:`, error);
  
  // Handle specific error codes
  switch(error.code) {
    case 'auth/too-many-requests':
      // Account has received too many login attempts
      return "Too many failed login attempts. Please try again later.";
    case 'auth/user-disabled':
      return "This account has been disabled.";
    case 'auth/requires-recent-login':
      return "This action requires recent authentication. Please sign in again.";
    default:
      return "An error occurred. Please try again.";
  }
}