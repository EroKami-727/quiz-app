import React, { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, orderBy } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import '../../styles/Teacher/Grading.css';
import { FaArrowLeft, FaTimes, FaCheckCircle, FaHourglassHalf, FaSave } from 'react-icons/fa';
import MediaRenderer from '../../components/MediaRenderer';

const AnswerToGrade = ({ originalQuestion, answer, onPointsChange, isGraded }) => {
    const renderUserAnswer = () => {
        const userAnswer = answer.userAnswer;
        if ((!userAnswer && typeof userAnswer !== 'string') || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
            return <p><i>No answer provided.</i></p>;
        }
        switch(originalQuestion.type) {
            case 'MCQ':
                return <ul className="grading-answer-list">{originalQuestion.mcqData.options.filter(opt => userAnswer.includes(opt.id)).map(opt => <li key={opt.id}><MediaRenderer media={opt.media} transform="thumbnail"/>{opt.text || 'Media Answer'}</li>)}</ul>;
            case 'FILL_IN_THE_BLANK': case 'PARAGRAPH':
                return <p className="grading-text-answer">{userAnswer}</p>;
            case 'REORDER':
                return <ol className="grading-answer-list">{userAnswer.map(item => <li key={item.id}><MediaRenderer media={item.media} transform="thumbnail"/>{item.text}</li>)}</ol>;
            case 'CATEGORIZE':
                return (<div className="grading-categorize-review">{originalQuestion.categorizeData.categories.map(cat => (<div key={cat.id}><strong>{cat.name}:</strong><ul className="grading-answer-list">{(userAnswer[cat.id] || []).map(item => <li key={item.id}><MediaRenderer media={item.media} transform="thumbnail"/>{item.text}</li>)}</ul></div>))}</div>);
            case 'MATCH_THE_FOLLOWING':
                 return (<ul className="grading-answer-list">{originalQuestion.matchData.pairs.map(pair => (<li key={pair.id}><div className="grading-match-review"><div className="grading-match-part"><MediaRenderer media={pair.promptMedia} transform="thumbnail"/>{pair.prompt}</div><span>→</span><div className="grading-match-part">{userAnswer.pairs?.[pair.id] ? <><MediaRenderer media={userAnswer.pairs[pair.id].answerMedia} transform="thumbnail"/>{userAnswer.pairs[pair.id].answerText}</> : <i>(unmatched)</i>}</div></div></li>))}</ul>);
            default: return <p><i>Review unavailable.</i></p>;
        }
    };

    return (
        <div className={`question-to-grade ${answer.status}`}>
            <h4>{answer.questionIndex + 1}. {originalQuestion.questionText}</h4>
            <div className="grading-details">
                <div className="student-answer-box">
                    <label>Student's Answer</label>
                    <div className="answer-content-box">{renderUserAnswer()}</div>
                </div>
                <div className="teacher-controls">
                    {originalQuestion.paragraphData?.keywords?.length > 0 && (
                        <div className="keywords-box">
                            <label>Grading Keywords</label>
                            <div className="keywords-list">{originalQuestion.paragraphData.keywords.map((kw, i) => <span key={i} className="keyword-chip">{kw.text}</span>)}</div>
                        </div>
                    )}
                    <div className="points-awarded-group">
                        <label htmlFor={`points-${answer.questionIndex}`}>Points Awarded</label>
                        <div className="points-input-container">
                            <input 
                                id={`points-${answer.questionIndex}`} type="number"
                                value={answer.pointsAwarded === null || answer.pointsAwarded === undefined ? '' : answer.pointsAwarded}
                                onChange={(e) => onPointsChange(e.target.value)}
                                max={originalQuestion.points} min="0" disabled={isGraded}
                            />
                            <span className="max-points-text">/ {originalQuestion.points}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Grading = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const auth = getAuth();

    const [loading, setLoading] = useState(true);
    const [quizDetails, setQuizDetails] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [error, setError] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchSubmissions = useCallback(async () => {
        if (!auth.currentUser) return;
        setLoading(true); setError('');
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

            // --- THE FIX IS HERE: Fetch user names for all submissions ---
            const userIds = [...new Set(fetchedSubmissions.map(sub => sub.userId))];
            const userNames = {};
            if (userIds.length > 0) {
                const usersQuery = query(collection(db, 'users'), where('__name__', 'in', userIds));
                const usersSnapshot = await getDocs(usersQuery);
                usersSnapshot.forEach(doc => {
                    userNames[doc.id] = doc.data().displayName || doc.data().email;
                });
            }

            // Combine submission data with user names
            const submissionsWithNames = fetchedSubmissions.map(sub => ({
                ...sub,
                userName: userNames[sub.userId] || 'Unknown Student'
            }));

            // Sort by status: pending first
            submissionsWithNames.sort((a, b) => {
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                return new Date(b.completedAt?.toDate()) - new Date(a.completedAt?.toDate());
            });
            
            setSubmissions(submissionsWithNames);

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
            answers: submission.answers.map((ans, index) => ({ ...ans, questionIndex: index }))
        };
        setSelectedSubmission(submissionWithEditableAnswers);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => { setIsModalOpen(false); setSelectedSubmission(null); };

    const handlePointsChange = (questionIndex, pointsStr) => {
        const points = pointsStr === '' ? null : parseInt(pointsStr, 10);
        const originalQuestionPoints = quizDetails.questions[questionIndex].points;

        setSelectedSubmission(currentSub => {
            const newAnswers = currentSub.answers.map((ans, index) => {
                if (index === questionIndex) {
                    if (points === null) { return { ...ans, pointsAwarded: null }; }
                    if (!isNaN(points) && points >= 0 && points <= originalQuestionPoints) { return { ...ans, pointsAwarded: points }; }
                }
                return ans;
            });
            return { ...currentSub, answers: newAnswers };
        });
    };

    const handleSubmitGrading = async () => {
        if (!selectedSubmission) return;
        setIsSaving(true);
        
        // Recalculate total score based on potentially edited points
        const totalScore = selectedSubmission.answers.reduce((sum, ans) => sum + (ans.pointsAwarded || 0), 0);
        
        const updatedAnswers = selectedSubmission.answers.map(ans => ({
            ...ans,
            status: 'manually_graded', // Mark all as graded/reviewed by teacher
            pointsAwarded: ans.pointsAwarded === null || ans.pointsAwarded === undefined ? 0 : ans.pointsAwarded,
        }));

        try {
            const submissionRef = doc(db, 'quiz_results', selectedSubmission.id);
            await updateDoc(submissionRef, {
                score: totalScore,
                finalScore: totalScore + (selectedSubmission.bonus || 0),
                answers: updatedAnswers,
                status: 'completed'
            });

            // Re-fetch to get the latest data and re-sort the list
            fetchSubmissions();
            handleCloseModal();
        } catch (err) {
            console.error("Error saving grade:", err);
            setError("Could not save the grade. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };


    if (loading) { return <div className="loading-screen">Loading Submissions...</div>; }

    return (
        <div className="grading-container">
            <div className="grading-content">
                <div className="page-header">
                    <button onClick={() => navigate('/teacher/your-quizzes')} className="back-btn"><FaArrowLeft /> Your Quizzes</button>
                    <h1 className="page-title">{quizDetails ? `Grading: ${quizDetails.title}` : 'Grading'}</h1>
                    <div className="submission-count">{submissions.length} Submissions</div>
                </div>
                {error && <div className="error-message">{error}</div>}
                {submissions.length === 0 ? (
                    <div className="no-submissions"><h3>No Submissions Yet</h3><p>Check back later once students have completed the quiz.</p></div>
                ) : (
                    <div className="submissions-list">
                        {submissions.map(sub => (
                            <div key={sub.id} className="submission-card">
                                <div className="student-info"><span className="student-name">{sub.userName}</span><span className="student-email">{sub.userEmail}</span></div>
                                <div className="score-info"><span className="score-label">Score</span><span className="score-value">{sub.status === 'completed' ? `${sub.finalScore} / ${sub.maxScore}` : `${sub.score} / ${sub.maxScore}`}</span></div>
                                <div className={`status-badge ${sub.status}`}>
                                    {sub.status === 'completed' ? <><FaCheckCircle/> Completed</> : <><FaHourglassHalf/> Pending Review</>}
                                </div>
                                <button className="grade-now-btn" onClick={() => handleOpenModal(sub)}>
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
                        <div className="modal-header"><h2>Grade: {selectedSubmission.userName}</h2><button onClick={handleCloseModal} className="close-btn"><FaTimes /></button></div>
                        <div className="modal-body">
                            {quizDetails.questions.map((originalQuestion, index) => (
                                <AnswerToGrade 
                                    key={originalQuestion.id || index}
                                    originalQuestion={originalQuestion}
                                    answer={selectedSubmission.answers[index]}
                                    onPointsChange={(points) => handlePointsChange(index, points)}
                                    isGraded={selectedSubmission.status === 'completed'}
                                />
                            ))}
                        </div>
                        {selectedSubmission.status !== 'completed' && (
                            <div className="modal-actions">
                                <button onClick={handleCloseModal} className="cancel-btn">Cancel</button>
                                <button onClick={handleSubmitGrading} className="save-grade-btn" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save & Complete Grade'}
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