 import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../../firebase'; // Import your Firebase configuration

const TeacherLogin = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const auth = getAuth(app);

  const toggleSignUp = () => {
    setIsSignUp(!isSignUp);
    setError(null); // Clear any previous errors when toggling
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        // Signup successful
        console.log('Teacher signed up successfully');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // Login successful
        console.log('Teacher logged in successfully');
      }
    } catch (err) {
      setError(err.message);
      console.error('Authentication error:', err.message);
    }
  };

  return (
    <div>
      <h2>{isSignUp ? 'Teacher Sign Up' : 'Teacher Login'}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleAuth}>
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
        <button type="submit">{isSignUp ? 'Sign Up' : 'Login'}</button>
      </form>
      <p>
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button type="button" onClick={toggleSignUp}>
          {isSignUp ? 'Login' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
};

export default TeacherLogin;