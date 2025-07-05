import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import '../../styles/Student/YourResults.css';
import MediaRenderer from '../../components/MediaRenderer';
import { FaTimes, FaArrowLeft, FaEye } from 'react-icons/fa';

// This is a new, smart component to render the review for each question type.
const QuestionReview = ({ originalQuestion, studentAnswerData, questionIndex }) => {
    const isCorrect = studentAnswerData.pointsAwarded >= originalQuestion.points;
    const statusClass = studentAnswerData.status === 'pending_review' ? 'student-pending' : isCorrect ? 'student-correct' : 'student-incorrect';
    const mainMediaToShow = originalQuestion.visualData?.mainMedia || originalQuestion.listeningData?.mainMedia || originalQuestion.media;

    const renderUserAnswer = () => {
        const userAnswer = studentAnswerData.userAnswer;
        if ((!userAnswer && typeof userAnswer !== 'string') || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
            return <p><i>No answer provided.</i></p>;
        }
        
        switch(originalQuestion.type) {
            case 'MCQ':
                const selectedIds = new Set(userAnswer || []);
                if (selectedIds.size === 0) return <p><i>No answer provided.</i></p>;
                return <ul className="review-answer-list">{originalQuestion.mcqData.options.filter(opt => selectedIds.has(opt.id)).map(opt => <li key={opt.id}><MediaRenderer media={opt.media} transform="thumbnail"/>{opt.text}</li>)}</ul>;
            case 'FILL_IN_THE_BLANK': case 'PARAGRAPH':
                return <p className="review-text-answer">{userAnswer}</p>;
            case 'REORDER':
                return <ol className="review-answer-list">{userAnswer.map(item => <li key={item.id}><MediaRenderer media={item.media} transform="thumbnail"/>{item.text}</li>)}</ol>;
            case 'CATEGORIZE':
                return (<div className="review-categorize-grid">{originalQuestion.categorizeData.categories.map(cat => (<div key={cat.id}><strong>{cat.name}:</strong><ul className="review-answer-list">{(userAnswer[cat.id] || []).map(item => <li key={item.id}><MediaRenderer media={item.media} transform="thumbnail"/>{item.text}</li>)}</ul></div>))}</div>);
            case 'MATCH_THE_FOLLOWING':
                 return (<ul className="review-answer-list">{originalQuestion.matchData.pairs.map(pair => (<li key={pair.id}><div className="review-match-item"><div className="review-match-prompt"><MediaRenderer media={pair.promptMedia} transform="thumbnail"/>{pair.prompt}</div><span>→</span><div className="review-match-answer">{userAnswer.pairs?.[pair.id] ? <><MediaRenderer media={userAnswer.pairs[pair.id].answerMedia} transform="thumbnail"/>{userAnswer.pairs[pair.id].answerText}</> : <i>(unmatched)</i>}</div></div></li>))}</ul>);
            default:
                return <p><i>Review unavailable for this question type.</i></p>;
        }
    };

    const renderCorrectAnswer = () => {
        switch(originalQuestion.type) {
            case 'MCQ': return <ul className="review-answer-list">{originalQuestion.mcqData.correctOptions.map(id => { const correctOpt = originalQuestion.mcqData.options.find(opt => opt.id === id); return <li key={id}><MediaRenderer media={correctOpt?.media} transform="thumbnail"/>{correctOpt?.text}</li> })}</ul>;
            case 'FILL_IN_THE_BLANK': return <p>{originalQuestion.fillBlankData.answers.map(a => a.text).join(' / ')}</p>;
            case 'REORDER': return <ol className="review-answer-list">{originalQuestion.reorderData.items.map(item => <li key={item.id}><MediaRenderer media={item.media} transform="thumbnail"/>{item.text}</li>)}</ol>;
            case 'CATEGORIZE': return (<div className="review-categorize-grid">{originalQuestion.categorizeData.categories.map(cat => (<div key={cat.id}><strong>{cat.name}:</strong><ul className="review-answer-list">{originalQuestion.categorizeData.items.filter(i => i.categoryId === cat.id).map(item => <li key={item.id}><MediaRenderer media={item.media} transform="thumbnail"/>{item.text}</li>)}</ul></div>))}</div>);
            case 'MATCH_THE_FOLLOWING': return (<ul className="review-answer-list">{originalQuestion.matchData.pairs.map(pair => (<li key={pair.id}>{pair.prompt} → {pair.answer}</li>))}</ul>);
            default: return null;
        }
    };

    return (
        <div className={`student-question-review-item ${statusClass}`}>
            <div className="student-question-review-header">
                <span className={`student-question-number ${statusClass}`}>Q{questionIndex + 1}</span>
                <p className="student-question-text">{originalQuestion.questionText}</p>
                <span className={`student-question-points ${statusClass}`}>{studentAnswerData.status === 'pending_review' ? 'Pending' : `${studentAnswerData.pointsAwarded} / ${originalQuestion.points}`}</span>
            </div>
            {mainMediaToShow && <div className="review-main-media-container"><MediaRenderer media={mainMediaToShow} transform="question_main"/></div>}
            <div className="student-question-review-body">
                <div className="student-answer-review-box student-user-answer">
                    <label>Your Answer</label>
                    <div className="student-answer-content">{renderUserAnswer()}</div>
                </div>
                {!isCorrect && studentAnswerData.status !== 'pending_review' && (
                    <div className="student-answer-review-box student-correct-answer">
                        <label>Correct Answer(s)</label>
                        <div className="student-answer-content">{renderCorrectAnswer()}</div>
                    </div>
                )}
            </div>
        </div>
    );
};


const YourResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [modalQuizDetails, setModalQuizDetails] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) { setLoading(false); navigate('/student/login'); return; }
    const fetchResults = async () => {
      try {
        setLoading(true); setError('');
        const resultsRef = collection(db, 'quiz_results');
        const q = query(resultsRef, where('userId', '==', currentUser.uid), orderBy('completedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedResults = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const displayScore = data.status === 'completed' ? data.finalScore : data.score;
            const percentage = data.maxScore > 0 ? Math.round((displayScore / data.maxScore) * 100) : 0;
            const correctCount = (data.answers || []).filter(ans => ans.pointsAwarded > 0).length;
            return { id: doc.id, ...data, displayScore, percentage, correctCount };
        });
        setResults(fetchedResults);
      } catch (err) { console.error('Error fetching quiz results:', err); setError(`Failed to load results: ${err.message}`); } 
      finally { setLoading(false); }
    };
    fetchResults();
  }, [currentUser, navigate]);
  
  const handleBackToDashboard = () => { navigate('/student/dashboard'); };
  const handleViewDetails = async (result) => {
    if (!result || !result.quizId) { setError('Cannot view details for this result.'); return; }
    setSelectedResult(result); setIsModalLoading(true);
    try {
        const quizDocRef = doc(db, 'quizzes', result.quizId);
        const quizDocSnap = await getDoc(quizDocRef);
        if (quizDocSnap.exists()) { setModalQuizDetails(quizDocSnap.data()); } 
        else { setError('Could not load original quiz details. It may have been deleted.'); }
    } catch (err) { setError('Error loading quiz details.'); console.error(err); } 
    finally { setIsModalLoading(false); }
  };
  const closeModal = () => { setSelectedResult(null); setModalQuizDetails(null); };
  const getScoreClass = (percentage) => { if (percentage >= 80) return 'student-excellent-score'; if (percentage >= 60) return 'student-good-score'; if (percentage >= 40) return 'student-okay-score'; return 'student-poor-score'; };

  // --- NEW, ENHANCED DATE FORMATTING FUNCTION ---
  const formatRelativeDate = (timestamp) => {
    if (!timestamp?.toDate) return { relative: 'Invalid Date', full: '' };
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffInSeconds = Math.round((now - date) / 1000);
    
    const fullDate = date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    if (diffInSeconds < 60) return { relative: 'Just now', full: fullDate };
    
    const diffInMinutes = Math.round(diffInSeconds / 60);
    if (diffInMinutes < 60) return { relative: `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`, full: fullDate };

    const diffInHours = Math.round(diffInMinutes / 60);
    if (diffInHours < 24) return { relative: `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`, full: fullDate };
    
    const diffInDays = Math.round(diffInHours / 24);
    if (diffInDays === 1) return { relative: 'Yesterday', full: fullDate };
    if (diffInDays < 7) return { relative: `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`, full: fullDate };

    return { relative: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), full: fullDate };
  };


  if (loading) { return <div className="student-results-loading-screen"><div className="student-results-loading-spinner"></div><p>Loading your results...</p></div>; }

  return (
    <div className="student-results-container">
      <div className="student-results-content">
        <div className="student-results-page-header">
          <button className="student-results-back-btn" onClick={handleBackToDashboard}><FaArrowLeft /> Back to Dashboard</button>
          <h1 className="student-results-page-title">Your Results</h1>
          <div className="student-results-count">{results.length} Result{results.length !== 1 ? 's' : ''}</div>
        </div>
        {error && <div className="student-results-error-message"><FaTimes /> {error}</div>}
        {results.length === 0 ? (
          <div className="student-results-no-results">
             <div className="student-results-no-results-icon">📊</div>
             <h3>No Quiz Results Yet</h3>
             <p>Complete a quiz to see your results here.</p>
             <button className="student-results-take-first-quiz-btn" onClick={() => navigate('/student/attend-quiz')}>Take a Quiz</button>
          </div>
        ) : (
          <div className="student-results-grid">
            {results.map((result) => {
              const { relative, full } = formatRelativeDate(result.completedAt);
              return (
                <div key={result.id} className="student-result-card">
                  <div className="student-result-card-header">
                    <h3 className="student-quiz-title">{result.quizTitle}</h3>
                    {result.status === 'completed' ? (<div className={`student-score-badge ${getScoreClass(result.percentage)}`}>{result.percentage}%</div>) : (<div className="student-score-badge student-pending-score">Pending</div>)}
                  </div>
                  <div className="student-result-card-body">
                    <div className="student-result-meta">
                      <div className="student-meta-item"><span>{result.correctCount}/{result.answers.length} Correct</span></div>
                      {/* --- UPDATED DATE DISPLAY --- */}
                      <div className="student-meta-item" title={full}>
                        <span>{relative}</span>
                      </div>
                    </div>
                    <div className="student-score-breakdown">
                      <div className="student-score-bar-container"><div className="student-score-bar-fill" style={{ width: `${result.percentage}%` }}></div></div>
                      <div className="student-score-text">{result.status === 'completed' ? `Final Score: ${result.finalScore} / ${result.maxScore}` : `Auto-Graded Score: ${result.score}`}</div>
                    </div>
                  </div>
                  <div className="student-result-card-actions">
                    <button className="student-action-btn student-primary" onClick={() => handleViewDetails(result)} title="View Details"><FaEye/></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedResult && (
        <div className="student-modal-overlay" onClick={closeModal}>
          <div className="student-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="student-modal-header"><h2>{selectedResult.quizTitle} - Review</h2><button className="student-close-btn" onClick={closeModal}><FaTimes /></button></div>
            <div className="student-modal-body">
              {isModalLoading ? (<div className="student-results-loading-screen-inner"><div className="student-results-loading-spinner"></div><p>Loading review...</p></div>
              ) : modalQuizDetails ? (
                <div className="student-questions-list">
                    {modalQuizDetails.questions.map((originalQuestion, index) => (
                        <QuestionReview key={originalQuestion.id || index} originalQuestion={originalQuestion} studentAnswerData={{...selectedResult.answers[index], questionIndex: index}} />
                    ))}
                </div>
              ) : <div className="student-results-error-message">Could not load review details for this quiz.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourResults;