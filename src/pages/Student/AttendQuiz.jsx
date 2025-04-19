// src/pages/Student/AttendQuiz.jsx
import React, { useState } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const AttendQuiz = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;
  const [quizCode, setQuizCode] = useState('');

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        navigate('/student/login');
      })
      .catch((error) => {
        console.error('Sign out error:', error);
      });
  };

  const handleJoinQuiz = () => {
    if (quizCode) {
      // In a real application, you would send this code to your backend
      console.log('Joining quiz with code:', quizCode);
      // navigate(`/student/quiz/${quizCode}`); // Example navigation
    } else {
      alert('Please enter a quiz code.');
    }
  };

  return (
    <div className="attend-quiz-full-container">
      <button onClick={handleSignOut} className="sign-out-top-btn">
        Sign Out
      </button>
      <div className="attend-quiz-content">
        <h1>Ready to Quiz?</h1>
        <p className="welcome-text">Welcome, {user?.email || 'Student'}</p>

        <div className="join-quiz-card">
          <h2>Join a Quiz</h2>
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter Quiz Code"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value)}
            />
            <button onClick={handleJoinQuiz} className="join-button">
              Join Now
            </button>
          </div>
        </div>

        <div className="available-quizzes-card">
          <h2>Available Quizzes</h2>
          <p>No quizzes available yet. Check back later!</p>
        </div>
      </div>
    </div>
  );
};

export default AttendQuiz;