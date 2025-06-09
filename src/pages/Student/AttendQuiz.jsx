import React, { useState, useEffect } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import '../../styles/Student/AttendQuiz.css'

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

  const handleGoToDashboard = () => {
    navigate('/student/dashboard'); // Navigates to the student dashboard
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

  // Format date helper function
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="attend-quiz-full-container">
      <button onClick={handleSignOut} className="sign-out-top-btn">
        Sign Out
      </button>
      <button onClick={handleGoToDashboard} className="back-dashboard-btn">
        <i className="fas fa-arrow-left"></i> Back to Dashboard
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
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading available quizzes...</p>
            </div>
          ) : availableQuizzes.length > 0 ? (
            <div className="quizzes-grid-student">
              {availableQuizzes.map((quiz, index) => (
                <div 
                  key={quiz.id} 
                  className="quiz-card-student"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="quiz-card-header-student">
                    <h3 className="quiz-title-student">{quiz.title}</h3>
                    <div className="quiz-status-student active">
                      <i className="fas fa-circle"></i>
                      Active
                    </div>
                  </div>
                  
                  <div className="quiz-card-body-student">
                    <p className="quiz-description-student">
                      {quiz.description || 'No description provided'}
                    </p>
                    
                    <div className="quiz-meta-student">
                      <div className="meta-item-student">
                        <i className="fas fa-question-circle"></i>
                        <span>{quiz.questions?.length || 0} Questions</span>
                      </div>
                      <div className="meta-item-student">
                        <i className="fas fa-clock"></i>
                        <span>{Math.floor((quiz.timeLimit || 60) / 60)}:{((quiz.timeLimit || 60) % 60).toString().padStart(2, '0')} mins</span>
                      </div>
                      <div className="meta-item-student">
                        <i className="fas fa-calendar"></i>
                        <span>{formatDate(quiz.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="quiz-code-display-student">
                      <span className="code-label-student">Quiz Code:</span>
                      <span className="code-value-student">{quiz.code}</span>
                    </div>
                  </div>
                  
                  <div className="quiz-card-actions-student">
                    <button 
                      onClick={() => handleJoinAvailableQuiz(quiz.id)}
                      className="take-quiz-btn-student"
                    >
                      <i className="fas fa-play"></i>
                      Take Quiz
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-quizzes-student">
              <div className="no-quizzes-icon-student">
                <i className="fas fa-clipboard-list"></i>
              </div>
              <h3>No Quizzes Available</h3>
              <p>Check back later for new quizzes!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendQuiz;