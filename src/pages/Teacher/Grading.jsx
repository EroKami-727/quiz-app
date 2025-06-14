import React, { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import '../../styles/Teacher/Grading.css';
import { FaArrowLeft, FaTimes, FaCheckCircle, FaHourglassHalf } from 'react-icons/fa';

const Grading = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const auth = getAuth();

    const [loading, setLoading] = useState(true);
    const [quizDetails, setQuizDetails] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [error, setError] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchSubmissions = useCallback(async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        setError('');
        try {
            // 1. Fetch Quiz Details
            const quizDocRef = doc(db, 'quizzes', quizId);
            const quizDocSnap = await getDoc(quizDocRef);
            if (!quizDocSnap.exists() || quizDocSnap.data().createdBy !== auth.currentUser.uid) {
                setError("Quiz not found or you don't have permission to grade it.");
                setLoading(false);
                return;
            }
            setQuizDetails(quizDocSnap.data());

            // 2. Fetch all submissions for this quiz
            const submissionsQuery = query(collection(db, "quiz_results"), where("quizId", "==", quizId));
            const querySnapshot = await getDocs(submissionsQuery);
            const fetchedSubmissions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort by status: pending first
            fetchedSubmissions.sort((a, b) => {
                if (a.status === 'pending_manual_grading' && b.status !== 'pending_manual_grading') return -1;
                if (a.status !== 'pending_manual_grading' && b.status === 'pending_manual_grading') return 1;
                return new Date(b.completedAt?.toDate()) - new Date(a.completedAt?.toDate());
            });
            
            setSubmissions(fetchedSubmissions);

        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to load submissions. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [quizId, auth.currentUser]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                fetchSubmissions();
            } else {
                navigate('/teacher/login');
            }
        });
        return () => unsubscribe();
    }, [fetchSubmissions, navigate]);


    const handleOpenModal = (submission) => {
        const submissionWithEditableAnswers = {
            ...submission,
            answers: submission.answers.map(ans => ({ ...ans }))
        };
        setSelectedSubmission(submissionWithEditableAnswers);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSubmission(null);
    };

    const handlePointsChange = (questionIndex, points) => {
        const newPoints = parseInt(points, 10);
        const updatedSubmission = { ...selectedSubmission };
        
        const originalQuestionPoints = quizDetails.questions[questionIndex].points;

        if (!isNaN(newPoints) && newPoints >= 0 && newPoints <= originalQuestionPoints) {
            updatedSubmission.answers[questionIndex].pointsAwarded = newPoints;
        } else if (points === '') {
             updatedSubmission.answers[questionIndex].pointsAwarded = null;
        }

        setSelectedSubmission(updatedSubmission);
    };

    const handleSubmitGrading = async () => {
        if (!selectedSubmission) return;
        setIsSaving(true);
        
        const { id, initialScore, answers } = selectedSubmission;

        const manualScore = answers
            .filter(ans => ans.status === 'pending_review')
            .reduce((sum, ans) => sum + (ans.pointsAwarded || 0), 0);
        
        const finalScore = (initialScore || 0) + manualScore;

        const updatedAnswers = answers.map(ans => {
            if (ans.status === 'pending_review') {
                return { 
                    ...ans, 
                    status: 'manually_graded',
                    pointsAwarded: ans.pointsAwarded === null || ans.pointsAwarded === undefined ? 0 : ans.pointsAwarded,
                 };
            }
            return ans;
        });

        try {
            const submissionRef = doc(db, 'quiz_results', id);
            await updateDoc(submissionRef, {
                finalScore: finalScore,
                manualScore: manualScore,
                answers: updatedAnswers,
                status: 'completed'
            });

            setSubmissions(prev => prev.map(sub => 
                sub.id === id ? { ...sub, finalScore, status: 'completed', answers: updatedAnswers } : sub
            ));

            handleCloseModal();
        } catch (err) {
            console.error("Error saving grade:", err);
            setError("Could not save the grade. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };


    if (loading) {
        return <div className="loading-screen">Loading Submissions...</div>;
    }

    return (
        <div className="grading-container">
            <div className="grading-content">
                <div className="page-header">
                    <button onClick={() => navigate('/teacher/your-quizzes')} className="back-btn">
                        <FaArrowLeft /> Your Quizzes
                    </button>
                    <h1 className="page-title">{quizDetails ? `Grading: ${quizDetails.title}` : 'Grading'}</h1>
                    <div className="submission-count">{submissions.length} Submissions</div>
                </div>

                {error && <div className="error-message">{error}</div>}

                {submissions.length === 0 ? (
                    <div className="no-submissions">
                        <h3>No Submissions Yet</h3>
                        <p>Check back later once students have completed the quiz.</p>
                    </div>
                ) : (
                    <div className="submissions-list">
                        {submissions.map(sub => (
                            <div key={sub.id} className="submission-card">
                                <div className="student-info">
                                    <span className="student-name">{sub.username || 'Unknown Student'}</span>
                                    <span className="student-email">{sub.userEmail}</span>
                                </div>
                                <div className="score-info">
                                    <span className="score-label">Score</span>
                                    <span className="score-value">
                                        {sub.status === 'completed' ? `${sub.finalScore} / ${sub.maxScore}` : `${sub.initialScore} / ${sub.maxScore}`}
                                    </span>
                                </div>
                                <div className={`status-badge ${sub.status}`}>
                                    {sub.status === 'completed' ? <><FaCheckCircle/> Completed</> : <><FaHourglassHalf/> Pending Review</>}
                                </div>
                                <button 
                                    className="grade-now-btn"
                                    onClick={() => handleOpenModal(sub)}
                                    disabled={sub.status === 'completed'}
                                >
                                    {sub.status === 'completed' ? 'View Graded' : 'Grade Now'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && selectedSubmission && quizDetails && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content grading-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Grade: {selectedSubmission.username}</h2>
                            <button onClick={handleCloseModal} className="close-btn"><FaTimes /></button>
                        </div>
                        <div className="modal-body">
                            {selectedSubmission.answers.map((answer, index) => {
                                if (answer.status !== 'pending_review' && answer.status !== 'manually_graded') return null;

                                const originalQuestion = quizDetails.questions[index];

                                return (
                                    <div key={index} className={`question-to-grade ${answer.status}`}>
                                        <h4>{index + 1}. {answer.questionText}</h4>
                                        <div className="grading-details">
                                            <div className="student-answer-box">
                                                <label>Student's Answer</label>
                                                <p>{answer.userAnswer}</p>
                                            </div>
                                            <div className="teacher-controls">
                                                {originalQuestion.gradingKeywords?.length > 0 && (
                                                    <div className="keywords-box">
                                                        <label>Keywords</label>
                                                        <div className="keywords-list">
                                                            {originalQuestion.gradingKeywords.map(kw => <span key={kw} className="keyword-chip">{kw}</span>)}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* --- THIS IS THE UPDATED JSX STRUCTURE FOR THE SCORE INPUT --- */}
                                                <div className="points-awarded-group">
                                                    <label htmlFor={`points-${index}`}>Points Awarded</label>
                                                    <div className="points-input-container">
                                                        <input 
                                                            id={`points-${index}`}
                                                            type="number"
                                                            value={answer.pointsAwarded === null || answer.pointsAwarded === undefined ? '' : answer.pointsAwarded}
                                                            onChange={(e) => handlePointsChange(index, e.target.value)}
                                                            max={originalQuestion.points}
                                                            min="0"
                                                            disabled={selectedSubmission.status === 'completed'}
                                                        />
                                                        <span className="max-points-text">/ {originalQuestion.points}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {selectedSubmission.status !== 'completed' && (
                            <div className="modal-actions">
                                <button onClick={handleCloseModal} className="cancel-btn">Cancel</button>
                                <button onClick={handleSubmitGrading} className="save-grade-btn" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save & Complete'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Grading;