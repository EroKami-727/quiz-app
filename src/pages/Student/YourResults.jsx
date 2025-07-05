import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import '../../styles/Student/YourResults.css';
import MediaRenderer from '../../components/MediaRenderer';
import { FaTimes, FaCheck, FaArrowLeft } from 'react-icons/fa';

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
        
        const resultsRef = collection(db, 'quiz_results');
        const q = query(
          resultsRef,
          where('userId', '==', currentUser.uid),
          orderBy('completedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedResults = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const displayScore = data.status === 'completed' ? data.finalScore : data.score;
            const percentage = data.maxScore > 0 ? Math.round((displayScore / data.maxScore) * 100) : 0;
            const correctCount = data.answers.filter(ans => ans.pointsAwarded > 0).length;

            return {
                id: doc.id,
                ...data,
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
          <button className="student-results-back-btn" onClick={handleBackToDashboard}><FaArrowLeft /> Back to Dashboard</button>
          <h1 className="student-results-page-title">Your Latest Results</h1>
          <div className="student-results-count">{results.length} Result{results.length !== 1 ? 's' : ''}</div>
        </div>

        {error && <div className="student-results-error-message"><FaTimes /> {error}</div>}

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
                    <div className="student-meta-item"><span>{result.correctCount}/{result.answers.length} Correct</span></div>
                    <div className="student-meta-item"><span>Time: {Math.round(result.timeSpent / 60)} min</span></div>
                    <div className="student-meta-item"><span>{formatDate(result.completedAt)}</span></div>
                  </div>
                  <div className="student-score-breakdown">
                    <div className="student-score-bar-container"><div className="student-score-bar-fill" style={{ width: `${result.percentage}%` }}></div></div>
                    <div className="student-score-text">
                        {result.status === 'completed' ? `Final Score: ${result.finalScore} / ${result.maxScore} points` : `Auto-Graded Score: ${result.score} points`}
                    </div>
                  </div>
                </div>
                <div className="student-result-card-actions">
                  <button className="student-action-btn student-primary" onClick={() => handleViewDetails(result)} title="View Details">View Review</button>
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
              <button className="student-close-btn" onClick={closeModal}><FaTimes /></button>
            </div>
            <div className="student-modal-body">
              {isModalLoading ? (
                 <div className="student-results-loading-screen-inner"><div className="student-results-loading-spinner"></div><p>Loading review...</p></div>
              ) : modalQuizDetails ? (
                <div className="student-questions-list">
                    {modalQuizDetails.questions.map((originalQuestion, index) => {
                        const studentAnswerData = selectedResult.answers[index];
                        const isCorrect = studentAnswerData.pointsAwarded >= originalQuestion.points;
                        const statusClass = studentAnswerData.status === 'pending_review' ? 'student-pending' : isCorrect ? 'student-correct' : 'student-incorrect';
                        
                        return(
                            <div key={originalQuestion.id} className={`student-question-review-item ${statusClass}`}>
                                <div className="student-question-review-header">
                                    <span className={`student-question-number ${statusClass}`}>Q{index + 1}</span>
                                    <p className="student-question-text">{originalQuestion.questionText}</p>
                                    <span className={`student-question-points ${statusClass}`}>{studentAnswerData.status === 'pending_review' ? 'Pending' : `${studentAnswerData.pointsAwarded} / ${originalQuestion.points}`}</span>
                                </div>

                                <div className="student-question-review-body">
                                    <div className="student-answer-review-box student-user-answer">
                                        <label>Your Answer</label>
                                        <div className="student-answer-content">
                                            {(() => {
                                                switch(originalQuestion.type) {
                                                    case 'MCQ':
                                                        const selectedOptionIds = studentAnswerData.userAnswer || [];
                                                        return selectedOptionIds.length > 0 ? originalQuestion.mcqData.options.filter(opt => selectedOptionIds.includes(opt.id)).map(opt => <div key={opt.id}>{opt.text}</div>) : <p><i>No answer provided.</i></p>;
                                                    case 'FILL_IN_THE_BLANK':
                                                    case 'PARAGRAPH':
                                                        return <p>{studentAnswerData.userAnswer || 'No answer provided.'}</p>;
                                                    default:
                                                        return <p><i>Review for this question type is not yet supported.</i></p>;
                                                }
                                            })()}
                                        </div>
                                    </div>
                                    {!isCorrect && studentAnswerData.status !== 'pending_review' && (
                                        <div className="student-answer-review-box student-correct-answer">
                                            <label>Correct Answer(s)</label>
                                            <div className="student-answer-content">
                                            {(() => {
                                                switch(originalQuestion.type) {
                                                    case 'MCQ':
                                                        return originalQuestion.mcqData.correctOptions.map(id => {
                                                            const correctOpt = originalQuestion.mcqData.options.find(opt => opt.id === id);
                                                            return <div key={id}>{correctOpt?.text}</div>
                                                        });
                                                    case 'FILL_IN_THE_BLANK':
                                                        return originalQuestion.fillBlankData.answers.map(ans => ans.text).join(', ');
                                                    default:
                                                        return <p><i>N/A for this question type.</i></p>;
                                                }
                                            })()}
                                            </div>
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