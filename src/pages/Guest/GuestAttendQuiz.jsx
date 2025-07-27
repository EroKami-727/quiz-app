import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import '../../styles/Student/AttendQuiz.css'; // You can reuse some styles

const GuestAttendQuiz = () => {
  const navigate = useNavigate();
  const [quizCode, setQuizCode] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinQuiz = async () => {
    if (!username.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!quizCode.trim()) {
      setError('Please enter a quiz code.');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const quizzesRef = collection(db, "quizzes");
      const q = query(quizzesRef, where("code", "==", quizCode.toUpperCase()), where("active", "==", true));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('No active quiz found with this code. Please check and try again.');
        return;
      }
      
      const quizDoc = querySnapshot.docs[0];
      
      // Navigate to the guest quiz page with the quiz ID and username
      navigate(`/guest/quiz/${quizDoc.id}`, { state: { username } });
      
    } catch (error) {
      console.error("Error joining quiz:", error);
      setError('Failed to join quiz. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="attend-quiz-full-container">
       <button onClick={() => navigate('/login')} className="back-dashboard-btn">
        <i className="fas fa-arrow-left"></i> Back to Login
      </button>
      <div className="attend-quiz-content">
        <h1>Join as a Guest</h1>
        <p className="welcome-text">Enter your name and the quiz code to start.</p>

        <div className="join-quiz-card">
          <h2>Join a Quiz</h2>
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter Your Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="text"
              placeholder="Enter Quiz Code"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinQuiz()}
              maxLength={6}
            />
            <button 
              onClick={handleJoinQuiz} 
              className="join-button"
              disabled={isLoading}
            >
              {isLoading ? 'Joining...' : 'Join Now'}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default GuestAttendQuiz;