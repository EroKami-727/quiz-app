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
    if (percentage >= 80) return 'excellent-score';
    if (percentage >= 60) return 'good-score';
    if (percentage >= 40) return 'okay-score';
    return 'poor-score';
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
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading your results...</p>
      </div>
    );
  }

  return (
    <div className="your-results-container">
      <button className="sign-out-top-btn" onClick={handleSignOut}>
        Sign Out
      </button>

      <div className="your-results-content">
        <div className="page-header">
          <button className="back-btn" onClick={handleBackToDashboard}>
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
          <h1 className="page-title">Your Quiz Results</h1>
          <div className="results-count">
            {results.length} Result{results.length !== 1 ? 's' : ''}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {results.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">📊</div>
            <h3>No Quiz Results Yet</h3>
            <p>You haven't completed any quizzes yet.</p>
            <button 
              className="take-first-quiz-btn"
              onClick={() => navigate('/student/attend-quiz')}
            >
              Take Your First Quiz
            </button>
          </div>
        ) : (
          <div className="results-grid">
            {results.map((result) => (
              <div key={result.id} className="result-card">
                <div className="result-card-header">
                  <h3 className="quiz-title">{result.quizTitle}</h3>
                  <div className={`score-badge ${getScoreClass(result.percentage)}`}>
                    {result.percentage}%
                  </div>
                </div>

                <div className="result-card-body">
                  <div className="result-meta">
                    <div className="meta-item">
                      <i className="fas fa-code"></i>
                      <span>Quiz Code: {result.quizCode}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-check-circle"></i>
                      <span>{result.correctAnswers}/{result.totalQuestions} Correct</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-clock"></i>
                      <span>Time: {result.timeTaken}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-calendar"></i>
                      <span>{formatDate(result.completedAt)}</span>
                    </div>
                  </div>

                  <div className="score-breakdown">
                    <div className="score-bar-container">
                      <div 
                        className="score-bar-fill"
                        style={{ width: `${result.percentage}%` }}
                      ></div>
                    </div>
                    <div className="score-text">
                      Score: {result.score}/{result.totalQuestions * 5} points
                    </div>
                  </div>
                </div>

                <div className="result-card-actions">
                  <button 
                    className="action-btn primary"
                    onClick={() => handleViewDetails(result)}
                    title="View Details"
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                  <button 
                    className="action-btn secondary"
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quiz Result Details</h2>
              <button className="close-btn" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>{selectedResult.quizTitle}</h3>
                
                <div className="result-summary">
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="label">Final Score</span>
                      <span className={`value score ${getScoreClass(selectedResult.percentage)}`}>
                        {selectedResult.percentage}%
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Points Earned</span>
                      <span className="value">{selectedResult.score}/{selectedResult.totalQuestions * 5}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Correct Answers</span>
                      <span className="value">{selectedResult.correctAnswers}/{selectedResult.totalQuestions}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Time Taken</span>
                      <span className="value">{selectedResult.timeTaken}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Quiz Code</span>
                      <span className="value code">{selectedResult.quizCode}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Completed On</span>
                      <span className="value">{formatDate(selectedResult.completedAt)}</span>
                    </div>
                  </div>
                </div>

                {selectedResult.questions && selectedResult.questions.length > 0 && (
                  <div className="questions-review">
                    <h4>Question Review ({selectedResult.questions.length} questions)</h4>
                    <div className="questions-list">
                      {selectedResult.questions.map((question, index) => (
                        <div key={question.id} className="question-review">
                          <div className={`question-number ${question.isCorrect ? 'correct' : 'incorrect'}`}>
                            {index + 1}
                            {question.isCorrect ? 
                              <i className="fas fa-check"></i> : 
                              <i className="fas fa-times"></i>
                            }
                          </div>
                          <div className="question-content">
                            <div className="question-text">{question.question}</div>
                            <div className="answers-review">
                              {question.options.map((option, optIndex) => (
                                <div 
                                  key={optIndex} 
                                  className={`option-review ${
                                    optIndex === question.correctAnswer ? 'correct-answer' : ''
                                  } ${
                                    optIndex === question.userAnswer ? 'user-answer' : ''
                                  }`}
                                >
                                  <span className="option-letter">
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>
                                  <span className="option-text">{option}</span>
                                  {optIndex === question.correctAnswer && (
                                    <span className="correct-icon">
                                      <i className="fas fa-check-circle"></i>
                                    </span>
                                  )}
                                  {optIndex === question.userAnswer && optIndex !== question.correctAnswer && (
                                    <span className="wrong-icon">
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