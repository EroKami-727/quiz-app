import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import '../../styles/Student/YourResults.css';

const YourResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [modalQuizDetails, setModalQuizDetails] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
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
        
        // Query quiz results for the current user with a limit of 6
        const resultsRef = collection(db, 'quiz_results');
        const q = query(
          resultsRef,
          where('userId', '==', currentUser.uid),
          orderBy('completedAt', 'desc'),
          limit(6) // Limit to 6 as requested
        );

        const querySnapshot = await getDocs(q);
        const fetchedResults = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const displayScore = data.status === 'completed' ? data.finalScore : data.initialScore;
            const percentage = data.maxScore > 0 ? Math.round((displayScore / data.maxScore) * 100) : 0;
            const correctCount = data.answers.filter(ans => ans.isCorrect === true).length;

            return {
                id: doc.id,
                ...data, // Include all original data
                displayScore,
                percentage,
                correctCount,
            };
        });

        setResults(fetchedResults);
      } catch (err) {
        console.error('Error fetching quiz results:', err);
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

  const handleViewDetails = async (result) => {
    setSelectedResult(result);
    setIsModalLoading(true);
    try {
        // Fetch the original quiz to get all question details (like options, correct answers)
        const quizDocRef = doc(db, 'quizzes', result.quizId);
        const quizDocSnap = await getDoc(quizDocRef);
        if (quizDocSnap.exists()) {
            setModalQuizDetails(quizDocSnap.data());
        } else {
            setError('Could not load quiz details for this result.');
        }
    } catch (err) {
        setError('Error loading quiz details.');
        console.error(err);
    } finally {
        setIsModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedResult(null);
    setModalQuizDetails(null);
  };

  const getScoreClass = (percentage) => {
    if (percentage >= 80) return 'student-excellent-score';
    if (percentage >= 60) return 'student-good-score';
    if (percentage >= 40) return 'student-okay-score';
    return 'student-poor-score';
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'Invalid Date';
    return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="student-results-loading-screen"><div className="student-results-loading-spinner"></div><p>Loading your results...</p></div>;
  }

  return (
    <div className="student-results-container">
      <button className="student-results-sign-out-btn" onClick={handleSignOut}>Sign Out</button>

      <div className="student-results-content">
        <div className="student-results-page-header">
          <button className="student-results-back-btn" onClick={handleBackToDashboard}><i className="fas fa-arrow-left"></i> Back to Dashboard</button>
          <h1 className="student-results-page-title">Your Latest Results</h1>
          <div className="student-results-count">{results.length} Result{results.length !== 1 ? 's' : ''}</div>
        </div>

        {error && <div className="student-results-error-message"><i className="fas fa-exclamation-triangle"></i> {error}</div>}

        {results.length === 0 ? (
          <div className="student-results-no-results">
             <div className="student-results-no-results-icon">📊</div>
             <h3>No Quiz Results Yet</h3>
             <p>You haven't completed any quizzes yet.</p>
             <button className="student-results-take-first-quiz-btn" onClick={() => navigate('/student/attend-quiz')}>Take Your First Quiz</button>
          </div>
        ) : (
          <div className="student-results-grid">
            {results.map((result) => (
              <div key={result.id} className="student-result-card">
                <div className="student-result-card-header">
                  <h3 className="student-quiz-title">{result.quizTitle}</h3>
                  {result.status === 'completed' ? (
                     <div className={`student-score-badge ${getScoreClass(result.percentage)}`}>{result.percentage}%</div>
                  ) : (
                    <div className="student-score-badge student-pending-score">Pending</div>
                  )}
                </div>

                <div className="student-result-card-body">
                  <div className="student-result-meta">
                    <div className="student-meta-item"><i className="fas fa-check-circle"></i><span>{result.correctCount}/{result.answers.length} Correct</span></div>
                    <div className="student-meta-item"><i className="fas fa-clock"></i><span>Time: {Math.round(result.timeSpent / 60)} min</span></div>
                    <div className="student-meta-item"><i className="fas fa-calendar"></i><span>{formatDate(result.completedAt)}</span></div>
                  </div>
                  <div className="student-score-breakdown">
                    <div className="student-score-bar-container"><div className="student-score-bar-fill" style={{ width: `${result.percentage}%` }}></div></div>
                    <div className="student-score-text">
                        {result.status === 'completed' ? `Final Score: ${result.finalScore} / ${result.maxScore} points` : `Auto-Graded Score: ${result.initialScore} points`}
                    </div>
                  </div>
                </div>

                <div className="student-result-card-actions">
                  <button className="student-action-btn student-primary" onClick={() => handleViewDetails(result)} title="View Details"><i className="fas fa-eye"></i></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedResult && (
        <div className="student-modal-overlay" onClick={closeModal}>
          <div className="student-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="student-modal-header">
              <h2>{selectedResult.quizTitle} - Review</h2>
              <button className="student-close-btn" onClick={closeModal}><i className="fas fa-times"></i></button>
            </div>
            <div className="student-modal-body">
              {isModalLoading ? (
                 <div className="student-results-loading-screen-inner"><div className="student-results-loading-spinner"></div><p>Loading review...</p></div>
              ) : modalQuizDetails ? (
                <div className="student-questions-list">
                    {selectedResult.answers.map((answer, index) => {
                        const originalQuestion = modalQuizDetails.questions[index];
                        const isCorrect = answer.isCorrect;
                        const statusClass = isCorrect === true ? 'student-correct' : (isCorrect === false ? 'student-incorrect' : 'student-pending');

                        return(
                            <div key={index} className={`student-question-review-item ${statusClass}`}>
                                <div className="student-question-review-header">
                                    <span className="student-question-number">Q{index + 1}</span>
                                    <p className="student-question-text">{answer.questionText}</p>
                                    <span className="student-question-points">
                                        {answer.pointsAwarded !== null ? `${answer.pointsAwarded} / ${originalQuestion.points}` : `Pending`}
                                    </span>
                                </div>
                                <div className="student-question-review-body">
                                    <div className="student-answer-review-box student-user-answer">
                                        <label>Your Answer</label>
                                        <p>{typeof answer.userAnswer === 'number' ? originalQuestion.options[answer.userAnswer] : answer.userAnswer}</p>
                                    </div>
                                    {isCorrect === false && (
                                        <div className="student-answer-review-box student-correct-answer">
                                            <label>Correct Answer</label>
                                            <p>{originalQuestion.type === 'MCQ' ? originalQuestion.options[originalQuestion.correctOption] : originalQuestion.answers.join(', ')}</p>
                                        </div>
                                    )}
                                    {/* --- TEACHER FEEDBACK --- */}
                                    {answer.teacherFeedback && (
                                        <div className="student-answer-review-box student-teacher-feedback">
                                            <label>Teacher's Feedback</label>
                                            <p>{answer.teacherFeedback}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
              ) : <div className="student-results-error-message">Could not load review details.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourResults;