import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from '../../firebase';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/Student/StudentLogin.css';

const StudentLogin = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const auth = getAuth(app);
    try {
      if (isSignUp) {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile to add display name
        await updateProfile(user, {
          displayName: displayName || email.split('@')[0] // Use part of email as fallback
        });
        
        // Store additional user data in Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName || email.split('@')[0],
          role: "student",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      } else {
        // Just sign in
        await signInWithEmailAndPassword(auth, email, password);
        
        // Update last login timestamp
        const user = auth.currentUser;
        if (user) {
          await setDoc(doc(db, "users", user.uid), {
            lastLogin: serverTimestamp()
          }, { merge: true });
        }
      }
      
      // Redirect after successful authentication
      navigate('/student/dashboard');
    } catch (error) {
      console.error("Authentication error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Mobile toggle for responsive design
  const renderMobileToggle = () => (
    <div className="mobile-switch">
      <button type="button" onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
      </button>
    </div>
  );

  return (
    <div className="student-auth-container">
      <div className={`student-auth-form-container ${isSignUp ? 'right-panel-active' : ''}`}>
        <div className="form-container sign-up-container">
          <form onSubmit={handleAuthAction}>
            <h1>Create Account</h1>
            <div className="social-container">
              <a href="#" className="social"><i className="fab fa-google"></i></a>
              <a href="#" className="social"><i className="fab fa-facebook"></i></a>
            </div>
            <span>or use your email for registration</span>
            <input 
              type="text" 
              placeholder="Display Name" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
            />
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Sign Up'}
            </button>
          </form>
        </div>
        <div className="form-container sign-in-container">
          <form onSubmit={handleAuthAction}>
            <h1>Sign in</h1>
            <div className="social-container">
              <a href="#" className="social"><i className="fab fa-google"></i></a>
              <a href="#" className="social"><i className="fab fa-facebook"></i></a>
            </div>
            <span>or use your account</span>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <a href="#">Forgot your password?</a>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Sign In'}
            </button>
          </form>
        </div>
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>Welcome Back!</h1>
              <br></br>
              <p>To keep connected with us please login with your personal info</p>
              <br></br>
              <button 
                className="ghost" 
                onClick={() => setIsSignUp(false)}
              >
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>Hello, Student!</h1>
              <br></br>
              <p>Enter your personal details and start your learning journey with us</p>
              <br></br>
              <button 
                className="ghost" 
                onClick={() => setIsSignUp(true)}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
        {renderMobileToggle()}
      </div>
      <div className="back-to-home">
        <Link to="/login">Back to Home</Link>
      </div>
    </div>
  );
};

export default StudentLogin;