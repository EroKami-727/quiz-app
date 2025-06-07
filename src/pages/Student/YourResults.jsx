import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/Student/YourResults.css';

const YourResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  // Mock data for demonstration - replace with actual API calls later
  const mockResults = [
    {
      id: 1,
      quizTitle: "JavaScript Fundamentals",
      quizCode: "JS2024",
      score: 85,
      totalQuestions: 20,
      correctAnswers: 17,
      timeTaken: "15 minutes",
      completedAt: "2024-12-15T10:30:00Z",
      percentage: 85,
      questions: [
        {
          id: 1,
          question: "What is the correct way to declare a variable in JavaScript?",
          options: ["var x = 5;", "variable x = 5;", "v x = 5;", "declare x = 5;"],
          correctAnswer: 0,
          userAnswer: 0,
          isCorrect: true
        },
        {
          id: 2,
          question: "Which method is used to add an element to the end of an array?",
          options: ["append()", "push()", "add()", "insert()"],
          correctAnswer: 1,
          userAnswer: 2,
          isCorrect: false
        }
      ]
    },
    {
      id: 2,
      quizTitle: "React Components",
      quizCode: "REACT01",
      score: 92,
      totalQuestions: 15,
      correctAnswers: 14,
      timeTaken: "12 minutes",
      completedAt: "2024-12-14T14:20:00Z",
      percentage: 93,
      questions: []
    },
    {
      id: 3,
      quizTitle: "CSS Flexbox",
      quizCode: "CSS2024",
      score: 76,
      totalQuestions: 18,
      correctAnswers: 14,
      timeTaken: "18 minutes",
      completedAt: "2024-12-13T09:15:00Z",
      percentage: 78,
      questions: []
    }
  ];

  useEffect(() => {
    // Simulate API call
    const fetchResults = async () => {
      try {
        setLoading(true);
        // Replace this with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setResults(mockResults);
      } catch (err) {
        setError('Failed to load quiz results');
        console.error('Error fetching results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                      Score: {result.score}/{result.totalQuestions * 5} points
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
                      <span className="student-value">{selectedResult.score}/{selectedResult.totalQuestions * 5}</span>
                    </div>
                    <div className="student-summary-item">
                      <span className="student-label">Correct Answers</span>
                      <span className="student-value">{selectedResult.correctAnswers}/{selectedResult.totalQuestions}</span>
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
                </div>

                {selectedResult.questions && selectedResult.questions.length > 0 && (
                  <div className="student-questions-review">
                    <h4>Question Review ({selectedResult.questions.length} questions)</h4>
                    <div className="student-questions-list">
                      {selectedResult.questions.map((question, index) => (
                        <div key={question.id} className="student-question-review">
                          <div className={`student-question-number ${question.isCorrect ? 'student-correct' : 'student-incorrect'}`}>
                            {index + 1}
                            {question.isCorrect ? 
                              <i className="fas fa-check"></i> : 
                              <i className="fas fa-times"></i>
                            }
                          </div>
                          <div className="student-question-content">
                            <div className="student-question-text">{question.question}</div>
                            <div className="student-answers-review">
                              {question.options.map((option, optIndex) => (
                                <div 
                                  key={optIndex} 
                                  className={`student-option-review ${
                                    optIndex === question.correctAnswer ? 'student-correct-answer' : ''
                                  } ${
                                    optIndex === question.userAnswer ? 'student-user-answer' : ''
                                  }`}
                                >
                                  <span className="student-option-letter">
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>
                                  <span className="student-option-text">{option}</span>
                                  {optIndex === question.correctAnswer && (
                                    <span className="student-correct-icon">
                                      <i className="fas fa-check-circle"></i>
                                    </span>
                                  )}
                                  {optIndex === question.userAnswer && optIndex !== question.correctAnswer && (
                                    <span className="student-wrong-icon">
                                      <i className="fas fa-times-circle"></i>
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourResults;