// src/pages/Student/AttendQuiz.jsx
import React, { useState, useEffect } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const AttendQuiz = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;
  const [quizCode, setQuizCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  // Fetch available quizzes when component mounts
  useEffect(() => {
    const fetchAvailableQuizzes = async () => {
      try {
        // In a real app, you might want to filter quizzes by class/group
        // For now, we'll just get active quizzes
        const quizzesRef = collection(db, "quizzes");
        const q = query(quizzesRef, where("active", "==", true));
        const querySnapshot = await getDocs(q);
        
        const quizzes = [];
        querySnapshot.forEach((doc) => {
          quizzes.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setAvailableQuizzes(quizzes);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchAvailableQuizzes();
  }, []);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        navigate('/student/login');
      })
      .catch((error) => {
        console.error('Sign out error:', error);
      });
  };

  const handleJoinQuiz = async () => {
    if (!quizCode.trim()) {
      setError('Please enter a quiz code.');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Query Firestore for a quiz with this code
      const quizzesRef = collection(db, "quizzes");
      const q = query(quizzesRef, where("code", "==", quizCode.toUpperCase()), where("active", "==", true));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('No active quiz found with this code. Please check and try again.');
        return;
      }
      
      // Get the first matching quiz - codes should be unique
      const quizDoc = querySnapshot.docs[0];
      
      // Navigate to the quiz page with the quiz ID
      navigate(`/student/quiz/${quizDoc.id}`);
      
    } catch (error) {
      console.error("Error joining quiz:", error);
      setError('Failed to join quiz. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinAvailableQuiz = (quizId) => {
    navigate(`/student/quiz/${quizId}`);
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

        <div className="available-quizzes-card">
          <h2>Available Quizzes</h2>
          
          {loadingQuizzes ? (
            <p>Loading available quizzes...</p>
          ) : availableQuizzes.length > 0 ? (
            <div className="quiz-list">
              {availableQuizzes.map((quiz) => (
                <div key={quiz.id} className="quiz-list-item">
                  <div className="quiz-info">
                    <h3>{quiz.title}</h3>
                    <p className="quiz-details">
                      <span>{quiz.questions.length} questions</span>
                      <span>•</span>
                      <span>{Math.floor(quiz.timeLimit / 60)}:{(quiz.timeLimit % 60).toString().padStart(2, '0')} time limit</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => handleJoinAvailableQuiz(quiz.id)}
                    className="join-quiz-btn"
                  >
                    Take Quiz
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p>No quizzes available yet. Check back later!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendQuiz;