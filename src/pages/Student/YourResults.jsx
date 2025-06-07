import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import '../../styles/Student/YourResults.css';

const YourResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const fetchResults = async () => {
      if (!currentUser) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Query quiz results for the current user - matching actual database fields
        const resultsRef = collection(db, 'quiz_results');
        const q = query(
          resultsRef,
          where('userId', '==', currentUser.uid),
          orderBy('completedAt', 'desc'),
          limit(10)
        );

        const querySnapshot = await getDocs(q);
        const fetchedResults = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Convert Firestore timestamp to JavaScript Date if needed
          let completedAt = data.completedAt;
          if (data.completedAt && data.completedAt.toDate) {
            completedAt = data.completedAt.toDate().toISOString();
          } else if (data.completedAt && typeof data.completedAt === 'string') {
            completedAt = data.completedAt;
          } else {
            completedAt = new Date().toISOString(); // Fallback
          }

          // Calculate basic stats from what's available
          const answersArray = data.answers || [];
          const totalQuestions = answersArray.length;
          const score = data.score || 0;
          const timeSpent = data.timeSpent || 0;
          
          // Calculate percentage based on score and total questions
          // Assuming each question is worth equal points
          const maxPossibleScore = totalQuestions > 0 ? (score / totalQuestions) * totalQuestions * 5 : 0; // Adjust multiplier as needed
          const percentage = totalQuestions > 0 ? Math.round((score )) : 0;

          fetchedResults.push({
            id: doc.id,
            quizTitle: data.displayname || 'Quiz Result', // Using displayname from your DB
            quizCode: data.quizID || 'N/A', // Note: your DB has quizID (capital D)
            score: score,
            totalQuestions: totalQuestions,
            correctAnswers: Math.floor(score / 5), // Assuming 5 points per correct answer
            timeTaken: timeSpent ? `${timeSpent} minutes` : 'N/A',
            completedAt: completedAt,
            percentage: percentage,
            userEmail: data.userEmail || currentUser.email,
            answers: answersArray,
            questions: [] // Your current DB doesn't seem to store questions
          });
        });

        setResults(fetchedResults);
      } catch (err) {
        console.error('Error fetching quiz results:', err);
        console.error('Error details:', err.message);
        setError(`Failed to load quiz results: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/student/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/student/dashboard');
  };

  const handleViewDetails = (result) => {
    setSelectedResult(result);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowDetailModal(false);
    setSelectedResult(null);
  };

  const getScoreClass = (percentage) => {
    if (percentage >= 80) return 'student-excellent-score';
    if (percentage >= 60) return 'student-good-score';
    if (percentage >= 40) return 'student-okay-score';
    return 'student-poor-score';
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatQuestionForReview = (question, userAnswer, correctAnswer) => {
    return {
      id: question.id || Math.random(),
      question: question.question || question.text || 'Question text not available',
      options: question.options || [],
      correctAnswer: correctAnswer,
      userAnswer: userAnswer,
      isCorrect: userAnswer === correctAnswer
    };
  };

  // Process questions for detailed view
  const getProcessedQuestions = (result) => {
    if (result.questions && result.questions.length > 0) {
      return result.questions.map((question, index) => {
        const userAnswer = result.answers && result.answers[index] ? result.answers[index] : null;
        const correctAnswer = question.correctAnswer || 0;
        return formatQuestionForReview(question, userAnswer, correctAnswer);
      });
    }
    return [];
  };

  if (loading) {
    return (
      <div className="student-results-loading-screen">
        <div className="student-results-loading-spinner"></div>
        <p>Loading your results...</p>
      </div>
    );
  }

  return (
    <div className="student-results-container">
      <button className="student-results-sign-out-btn" onClick={handleSignOut}>
        Sign Out
      </button>

      <div className="student-results-content">
        <div className="student-results-page-header">
          <button className="student-results-back-btn" onClick={handleBackToDashboard}>
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
          <h1 className="student-results-page-title">Your Quiz Results</h1>
          <div className="student-results-count">
            {results.length} Result{results.length !== 1 ? 's' : ''}
          </div>
        </div>

        {error && (
          <div className="student-results-error-message">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {results.length === 0 ? (
          <div className="student-results-no-results">
            <div className="student-results-no-results-icon">📊</div>
            <h3>No Quiz Results Yet</h3>
            <p>You haven't completed any quizzes yet.</p>
            <button 
              className="student-results-take-first-quiz-btn"
              onClick={() => navigate('/student/attend-quiz')}
            >
              Take Your First Quiz
            </button>
          </div>
        ) : (
          <div className="student-results-grid">
            {results.map((result) => (
              <div key={result.id} className="student-result-card">
                <div className="student-result-card-header">
                  <h3 className="student-quiz-title">{result.quizTitle}</h3>
                  <div className={`student-score-badge ${getScoreClass(result.percentage)}`}>
                    {result.percentage}%
                  </div>
                </div>

                <div className="student-result-card-body">
                  <div className="student-result-meta">
                    <div className="student-meta-item">
                      <i className="fas fa-code"></i>
                      <span>Quiz Code: {result.quizCode}</span>
                    </div>
                    <div className="student-meta-item">
                      <i className="fas fa-check-circle"></i>
                      <span>{result.correctAnswers}/{result.totalQuestions} Correct</span>
                    </div>
                    <div className="student-meta-item">
                      <i className="fas fa-clock"></i>
                      <span>Time: {result.timeTaken}</span>
                    </div>
                    <div className="student-meta-item">
                      <i className="fas fa-calendar"></i>
                      <span>{formatDate(result.completedAt)}</span>
                    </div>
                  </div>

                  <div className="student-score-breakdown">
                    <div className="student-score-bar-container">
                      <div 
                        className="student-score-bar-fill"
                        style={{ width: `${result.percentage}%` }}
                      ></div>
                    </div>
                    <div className="student-score-text">
                      Score: {result.score} points
                    </div>
                  </div>
                </div>

                <div className="student-result-card-actions">
                  <button 
                    className="student-action-btn student-primary"
                    onClick={() => handleViewDetails(result)}
                    title="View Details"
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                  <button 
                    className="student-action-btn student-secondary"
                    onClick={() => navigate(`/student/quiz/${result.quizCode}`)}
                    title="Retake Quiz"
                  >
                    <i className="fas fa-redo"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedResult && (
        <div className="student-modal-overlay" onClick={closeModal}>
          <div className="student-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="student-modal-header">
              <h2>Quiz Result Details</h2>
              <button className="student-close-btn" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="student-modal-body">
              <div className="student-detail-section">
                <h3>{selectedResult.quizTitle}</h3>
                
                <div className="student-result-summary">
                  <div className="student-summary-grid">
                    <div className="student-summary-item">
                      <span className="student-label">Final Score</span>
                      <span className={`student-value student-score ${getScoreClass(selectedResult.percentage)}`}>
                        {selectedResult.percentage}%
                      </span>
                    </div>
                    <div className="student-summary-item">
                      <span className="student-label">Points Earned</span>
                      <span className="student-value">{selectedResult.score}</span>
                    </div>
                    <div className="student-summary-item">
                      <span className="student-label">Questions Answered</span>
                      <span className="student-value">{selectedResult.totalQuestions}</span>
                    </div>
                    <div className="student-summary-item">
                      <span className="student-label">Time Taken</span>
                      <span className="student-value">{selectedResult.timeTaken}</span>
                    </div>
                    <div className="student-summary-item">
                      <span className="student-label">Quiz Code</span>
                      <span className="student-value student-code">{selectedResult.quizCode}</span>
                    </div>
                    <div className="student-summary-item">
                      <span className="student-label">Completed On</span>
                      <span className="student-value">{formatDate(selectedResult.completedAt)}</span>
                    </div>
                  </div>

                  {/* Show answers array if available */}
                  {selectedResult.answers && selectedResult.answers.length > 0 && (
                    <div className="student-answers-summary">
                      <h4>Your Answers</h4>
                      <div className="student-answers-grid">
                        {selectedResult.answers.map((answer, index) => (
                          <div key={index} className="student-answer-item">
                            <span className="student-question-num">Q{index + 1}:</span>
                            <span className="student-answer-value">
                              {typeof answer === 'number' ? 
                                String.fromCharCode(65 + answer) : 
                                answer
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourResults;