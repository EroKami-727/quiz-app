import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../../firebase';
import { Link, useNavigate } from 'react-router-dom';
import '../../App.css';

const TeacherLogin = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Hook for navigation

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const auth = getAuth(app);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        // After successful signup, redirect to create quiz page
        navigate('/teacher/create-quiz');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // After successful login, redirect to create quiz page
        navigate('/teacher/create-quiz');
      }
    } catch (err) {
      setError(err.message);
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
    <div className="teacher-auth-container">
      <div className={`teacher-auth-form-container ${isSignUp ? 'right-panel-active' : ''}`}>
        <div className="form-container sign-up-container">
          <form onSubmit={handleAuth}>
            <h1>Create Account</h1>
            <div className="social-container">
              <a href="#" className="social"><i className="fab fa-google"></i></a>
              <a href="#" className="social"><i className="fab fa-facebook"></i></a>
            </div>
            <span>or use your email for registration</span>
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
          <form onSubmit={handleAuth}>
            <h1>Sign in</h1>
            <div className="social-container">
              <a href="#" className="social"><i className="fab fa-google"></i></a>
              <a href="#" className="social"><i className="fab fa-facebook"></i></a>
            </div>
            <span>or use your teacher account</span>
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
              <p>To access your teaching tools, please login with your credentials</p>
              <br></br>
              <button 
                className="ghost" 
                onClick={() => setIsSignUp(false)}
              >
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>Hello, Teacher!
              </h1><br></br>  
              <p>Enter your details and start creating engaging quizzes for your students</p>
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
      </div>
      {/* Display mobile toggle in smaller screens */}
      {renderMobileToggle()}
      <div className="back-to-home">
        <Link to="/login">Back to Home</Link>
      </div>
    </div>
  );
};

export default TeacherLogin;