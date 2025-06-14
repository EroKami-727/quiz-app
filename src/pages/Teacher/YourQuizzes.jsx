import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/Teacher/YourQuizzes.css';

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
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/teacher/login');
    }
  }, [loading, user, navigate]);
  
  useEffect(() => {
    if (user) {
      fetchQuizzes();
    }
  }, [user]);
  
  const fetchQuizzes = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };
  
  const handleSignOut = () => {
    signOut(auth).then(() => navigate('/teacher/login')).catch(console.error);
  };
  
  const handleBackToHome = () => {
    navigate('/teacher/dashboard');
  };
  
  const handleViewDetails = (quiz) => {
    setSelectedQuiz(quiz);
    setShowDetailsModal(true);
  };
  
  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setSuccessMessage('Quiz code copied to clipboard!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Failed to copy code');
      setTimeout(() => setError(''), 3000);
    }
  };
  
  const handleGradeSubmissions = (quizId) => {
    navigate(`/teacher/grading/${quizId}`);
  };

  const handleViewResults = (quizId) => {
    navigate(`/teacher/results/${quizId}`);
  };
  
  const handleToggleActive = async (quiz) => {
    setIsLoading(true);
    try {
      const quizRef = doc(db, "quizzes", quiz.id);
      await updateDoc(quizRef, { active: !quiz.active });
      setQuizzes(quizzes.map(q => q.id === quiz.id ? { ...q, active: !q.active } : q));
      setSuccessMessage(`Quiz ${!quiz.active ? 'activated' : 'deactivated'}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Error updating quiz: ", error);
      setError('Error updating quiz: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteClick = (quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteModal(true);
  };
  
  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "quizzes", quizToDelete.id));
      setQuizzes(quizzes.filter(q => q.id !== quizToDelete.id));
      setSuccessMessage('Quiz deleted successfully!');
      setShowDeleteModal(false);
      setQuizToDelete(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Error deleting quiz: ", error);
      setError('Error deleting quiz: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'Unknown date';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  
  if (loading || isLoading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  return (
    <div className="your-quizzes-container">
      <button onClick={handleSignOut} className="sign-out-top-btn">Sign Out</button>
      
      <div className="your-quizzes-content">
        <div className="page-header">
          <button onClick={handleBackToHome} className="back-btn">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
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
            <button onClick={() => navigate('/teacher/create-quiz')} className="create-first-quiz-btn">
              Create Your First Quiz
            </button>
          </div>
        ) : (
          <div className="quizzes-grid">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="quiz-card">
                <div className="quiz-card-header">
                  <h3 className="quiz-title">{quiz.title}</h3>
                  <div className={`quiz-status ${quiz.active ? 'active' : 'inactive'}`}>
                    {quiz.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                <div className="quiz-card-body">
                  <p className="quiz-description">{quiz.description || 'No description provided'}</p>
                  <div className="quiz-meta">
                    <div className="meta-item">
                      <i className="fas fa-question-circle"></i>
                      <span>{quiz.questions?.length || 0} Questions</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-star"></i>
                      <span>{quiz.totalPoints || 0} Points</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-calendar"></i>
                      <span>{formatDate(quiz.createdAt)}</span>
                    </div>
                  </div>
                  <div className="quiz-code-display">
                    <span className="code-label">Quiz Code:</span>
                    <span className="code-value">{quiz.code}</span>
                  </div>
                </div>
                
                <div className="quiz-card-actions">
                  <button onClick={() => handleViewDetails(quiz)} className="action-btn primary" title="View Details">
                    <i className="fas fa-eye"></i>
                  </button>
                  <button onClick={() => handleCopyCode(quiz.code)} className="action-btn secondary" title="Copy Code">
                    <i className="fas fa-copy"></i>
                  </button>
                  <button onClick={() => handleViewResults(quiz.id)} className="action-btn info" title="View All Results">
                    <i className="fas fa-chart-bar"></i>
                  </button>
                  <button onClick={() => handleGradeSubmissions(quiz.id)} className="action-btn grade" title="Grade Submissions">
                    <i className="fas fa-marker"></i>
                  </button>
                  <button onClick={() => handleToggleActive(quiz)} className={`action-btn ${quiz.active ? 'warning' : 'success'}`} title={quiz.active ? 'Deactivate' : 'Activate'}>
                    <i className={`fas ${quiz.active ? 'fa-pause' : 'fa-play'}`}></i>
                  </button>
                  <button onClick={() => handleDeleteClick(quiz)} className="action-btn danger" title="Delete Quiz">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* --- FIX: Restored the full modal code here --- */}
      {showDetailsModal && selectedQuiz && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quiz Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>{selectedQuiz.title}</h3>
                <p className="quiz-description-modal">{selectedQuiz.description || 'No description provided'}</p>
                <div className="quiz-info-grid">
                   <div className="info-item">
                    <span className="label">Questions:</span>
                    <span className="value">{selectedQuiz.questions?.length || 0}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Total Points:</span>
                    <span className="value">{selectedQuiz.totalPoints || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Status:</span>
                    <span className={`value status ${selectedQuiz.active ? 'active' : 'inactive'}`}>{selectedQuiz.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Quiz Code:</span>
                    <span className="value code">{selectedQuiz.code}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Created:</span>
                    <span className="value">{formatDate(selectedQuiz.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="questions-section">
                <h4>Questions Preview</h4>
                <div className="questions-list">
                  {selectedQuiz.questions?.map((question, index) => (
                    <div key={index} className="question-preview">
                      <div className="question-number">Q{index + 1}</div>
                      <div className="question-content">
                        <p className="question-text">{question.text}</p>
                        {/* Add more detail previews for other question types if needed */}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* --- FIX: Restored the full modal code here --- */}
      {showDeleteModal && quizToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Quiz</h2>
              <button onClick={() => setShowDeleteModal(false)} className="close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <i className="fas fa-exclamation-triangle warning-icon"></i>
                <p>Are you sure you want to delete the quiz <strong>"{quizToDelete.title}"</strong>?</p>
                <p className="warning-text">This action cannot be undone. All associated data will be permanently removed.</p>
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowDeleteModal(false)} className="cancel-btn">Cancel</button>
                <button onClick={handleDeleteQuiz} className="delete-confirm-btn">Delete Quiz</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourQuizzes;