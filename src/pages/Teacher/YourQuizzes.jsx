import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/Teacher/YourQuizzes.css';
import { FaEye, FaCopy, FaChartBar, FaMarker, FaPlay, FaPause, FaTrash, FaArrowLeft, FaTimes, FaPen } from 'react-icons/fa';
import MediaRenderer from '../../components/MediaRenderer'; // We need this to show media in the modal

// New, powerful component for rendering full question previews in the modal
const QuestionDetailsPreview = ({ question, index }) => {
    const mainMediaToShow = question.visualData?.mainMedia || question.listeningData?.mainMedia || question.media;

    return (
        <div className="question-preview-item">
            <div className="question-preview-header">
                <span className="question-preview-number">Q{index + 1}</span>
                <span className="question-preview-type">{question.type.replace(/_/g, ' ')}</span>
                <span className="question-preview-points">{question.points} Pts</span>
            </div>
            <div className="question-preview-content">
                {mainMediaToShow && <MediaRenderer media={mainMediaToShow} transform="question_main" />}
                <p className="question-preview-text">{question.questionText}</p>
                <div className="question-preview-body">
                    {question.mcqData?.options && (
                        <ul className="preview-options-list">
                            {question.mcqData.options.map(opt => (
                                <li key={opt.id} className={question.mcqData.correctOptions.includes(opt.id) ? 'correct' : ''}>
                                    <MediaRenderer media={opt.media} transform="thumbnail" />
                                    <span>{opt.text}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {question.fillBlankData?.answers && (
                        <div className="preview-text-answer">Correct answers: {question.fillBlankData.answers.map(a => `"${a.text}"`).join(', ')}</div>
                    )}
                    {question.matchData?.pairs && (
                        <ul className="preview-options-list match">
                            {question.matchData.pairs.map(p => (
                                <li key={p.id}>
                                    <div className="preview-match-item">
                                        <div className="preview-match-part"><MediaRenderer media={p.promptMedia} transform="thumbnail"/><span>{p.prompt}</span></div>
                                        <span>↔</span>
                                        <div className="preview-match-part"><MediaRenderer media={p.answerMedia} transform="thumbnail"/><span>{p.answer}</span></div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {question.categorizeData && (
                        <div>
                            {question.categorizeData.categories.map(cat => (
                                <div key={cat.id} className="preview-category-group">
                                    <strong>{cat.name}:</strong>
                                    <ul className="preview-options-list">
                                        {question.categorizeData.items.filter(i => i.categoryId === cat.id).map(item => <li key={item.id}><MediaRenderer media={item.media} transform="thumbnail"/>{item.text}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                     {question.reorderData?.items && (
                        <ol className="preview-options-list reorder">
                            {question.reorderData.items.map(item => <li key={item.id}><MediaRenderer media={item.media} transform="thumbnail"/>{item.text}</li>)}
                        </ol>
                    )}
                </div>
            </div>
        </div>
    );
};

const YourQuizzes = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if(currentUser) {
        setUser(currentUser);
      } else {
        setLoading(false);
        navigate('/teacher/login');
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);
  
  useEffect(() => {
    if (user) {
      fetchQuizzes();
    }
  }, [user]);
  
  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "quizzes"),
        where("createdBy", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedQuizzes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizzes(fetchedQuizzes);
    } catch (error) {
      console.error("Error fetching quizzes: ", error);
      setError('Error loading quizzes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleBackToHome = () => { navigate('/teacher/home'); };
  const handleViewDetails = (quiz) => { setSelectedQuiz(quiz); setShowDetailsModal(true); };
  const handleEditQuiz = (quizId) => { navigate(`/teacher/edit-quiz/${quizId}`); };
  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setSuccessMessage('Quiz code copied!');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) { setError('Failed to copy code'); setTimeout(() => setError(''), 3000); }
  };
  const handleGradeSubmissions = (quizId) => { navigate(`/teacher/grading/${quizId}`); };
  const handleViewResults = (quizId) => { navigate(`/teacher/results/${quizId}`); };
  
  const handleToggleActive = async (quiz) => {
    const newStatus = !quiz.active;
    try {
      const quizRef = doc(db, "quizzes", quiz.id);
      await updateDoc(quizRef, { active: newStatus });
      setQuizzes(quizzes.map(q => q.id === quiz.id ? { ...q, active: newStatus } : q));
      setSuccessMessage(`Quiz ${newStatus ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) { console.error("Error updating quiz: ", error); setError('Error updating quiz status.'); }
  };
  
  const handleDeleteClick = (quiz) => { setQuizToDelete(quiz); setShowDeleteModal(true); };
  
  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      await deleteDoc(doc(db, "quizzes", quizToDelete.id));
      setQuizzes(quizzes.filter(q => q.id !== quizToDelete.id));
      setSuccessMessage('Quiz deleted successfully.');
      setShowDeleteModal(false);
      setQuizToDelete(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) { console.error("Error deleting quiz: ", error); setError('Error deleting quiz: ' + error.message); }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'Unknown date';
    return timestamp.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  if (loading) { return <div className="loading-screen">Loading...</div>; }
  
  return (
    <div className="your-quizzes-container">
      <div className="your-quizzes-content">
        <div className="page-header">
          <button onClick={handleBackToHome} className="back-btn"><FaArrowLeft /> Dashboard</button>
          <h1 className="page-title">Your Quizzes</h1>
          <div className="quiz-count">{quizzes.length} Quiz{quizzes.length !== 1 ? 'es' : ''}</div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        
        {quizzes.length === 0 ? (
          <div className="no-quizzes">
            <div className="no-quizzes-icon"><i className="fas fa-clipboard-list"></i></div>
            <h3>No Quizzes Created Yet</h3>
            <p>Create your first quiz to get started!</p>
            <button onClick={() => navigate('/teacher/home')} className="create-first-quiz-btn">Create a Quiz</button>
          </div>
        ) : (
          <div className="quizzes-grid">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="quiz-card">
                <div className="quiz-card-header">
                  <h3 className="quiz-title">{quiz.title}</h3>
                  <div className={`quiz-status ${quiz.active ? 'active' : 'inactive'}`}>{quiz.active ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="quiz-card-body">
                  <p className="quiz-description">{quiz.description || 'No description provided'}</p>
                  <div className="quiz-meta">
                    <div className="meta-item"><span>{quiz.questions?.length || 0} Questions</span></div>
                    <div className="meta-item"><span>{quiz.totalPoints || 0} Points</span></div>
                    <div className="meta-item"><span>{formatDate(quiz.createdAt)}</span></div>
                  </div>
                  <div className="quiz-code-display">
                    <span className="code-label">Quiz Code:</span><span className="code-value">{quiz.code}</span>
                    <button onClick={() => handleCopyCode(quiz.code)} className="copy-code-btn" title="Copy Code"><FaCopy /></button>
                  </div>
                </div>
                <div className="quiz-card-actions">
                  <button onClick={() => handleViewDetails(quiz)} className="action-btn primary" title="View Details"><FaEye /></button>
                  <button onClick={() => handleEditQuiz(quiz.id)} className="action-btn secondary" title="Edit Quiz"><FaPen /></button>
                  <button onClick={() => handleViewResults(quiz.id)} className="action-btn info" title="View All Results"><FaChartBar /></button>
                  <button onClick={() => handleGradeSubmissions(quiz.id)} className="action-btn grade" title="Grade Submissions"><FaMarker /></button>
                  <button onClick={() => handleToggleActive(quiz)} className={`action-btn ${quiz.active ? 'warning' : 'success'}`} title={quiz.active ? 'Deactivate' : 'Activate'}><i className={`fas ${quiz.active ? 'fa-pause' : 'fa-play'}`}></i></button>
                  <button onClick={() => handleDeleteClick(quiz)} className="action-btn danger" title="Delete Quiz"><FaTrash /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showDetailsModal && selectedQuiz && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedQuiz.title}</h2>
              <button onClick={() => setShowDetailsModal(false)} className="close-btn"><FaTimes /></button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Quiz Overview</h3>
                <p className="quiz-description-modal">{selectedQuiz.description || 'No description provided.'}</p>
                <div className="quiz-info-grid">
                   <div className="info-item"><span className="label">Questions:</span><span className="value">{selectedQuiz.questions?.length || 0}</span></div>
                   <div className="info-item"><span className="label">Total Points:</span><span className="value">{selectedQuiz.totalPoints || 'N/A'}</span></div>
                   <div className="info-item"><span className="label">Status:</span><span className={`value status ${selectedQuiz.active ? 'active' : 'inactive'}`}>{selectedQuiz.active ? 'Active' : 'Inactive'}</span></div>
                   <div className="info-item"><span className="label">Quiz Code:</span><span className="value code">{selectedQuiz.code}</span></div>
                </div>
              </div>
              <div className="questions-section">
                <h4>Questions Preview</h4>
                <div className="questions-list">
                  {selectedQuiz.questions?.map((question, index) => (
                    <QuestionDetailsPreview key={question.id || index} question={question} index={index} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showDeleteModal && quizToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Delete Quiz</h2><button onClick={() => setShowDeleteModal(false)} className="close-btn"><FaTimes /></button></div>
            <div className="modal-body">
              <div className="delete-warning"><i className="fas fa-exclamation-triangle warning-icon"></i><p>Are you sure you want to delete the quiz <strong>"{quizToDelete.title}"</strong>?</p><p className="warning-text">This action cannot be undone.</p></div>
              <div className="modal-actions"><button onClick={() => setShowDeleteModal(false)} className="cancel-btn">Cancel</button><button onClick={handleDeleteQuiz} className="delete-confirm-btn">Delete Quiz</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourQuizzes;