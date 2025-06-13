import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import '../../styles/Student/TakeQuiz.css';

const TakeQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;

    // State for quiz data and user info
    const [quiz, setQuiz] = useState(null);
    const [userName, setUserName] = useState('');

    // State for UI and loading
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State for quiz progression
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState([]);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [finalResults, setFinalResults] = useState(null);
    
    // State for timers
    const [timeLeft, setTimeLeft] = useState(null);
    const [perQuestionTimeLeft, setPerQuestionTimeLeft] = useState(null);

    // Effect to fetch quiz data
    useEffect(() => {
        const fetchQuiz = async () => {
            setLoading(true);
            try {
                const quizDocRef = doc(db, "quizzes", quizId);
                const quizDocSnap = await getDoc(quizDocRef);

                if (quizDocSnap.exists()) {
                    const quizData = quizDocSnap.data();
                    setQuiz(quizData);
                    setSelectedAnswers(new Array(quizData.questions.length).fill(''));
                    if (quizData.overallTimeLimit) {
                        setTimeLeft(quizData.overallTimeLimit);
                    }
                } else {
                    setError('Quiz not found. It might have been deleted or the link is incorrect.');
                }
            } catch (err) {
                console.error("Error fetching quiz:", err);
                setError('Failed to load quiz. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        if (quizId) fetchQuiz();
    }, [quizId]);

    // Effect to fetch student's user data
    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        setUserName(userDocSnap.data().displayName || user.email);
                    } else {
                        setUserName(user.email); // Fallback to email
                    }
                } catch (err) {
                    console.error("Error fetching user data:", err);
                    setUserName(user.email); // Fallback on error
                }
            }
        };
        fetchUserData();
    }, [user]);

    // Effect for timers
    useEffect(() => {
        if (!quizStarted || quizSubmitted || !quiz) return;
        let timer;
        const isOverallTimer = quiz.overallTimeLimit !== undefined;
        if (isOverallTimer) {
            if (timeLeft > 0) {
                timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            } else if (timeLeft === 0) {
                handleSubmitQuiz();
            }
        } else {
            if (perQuestionTimeLeft > 0) {
                timer = setTimeout(() => setPerQuestionTimeLeft(perQuestionTimeLeft - 1), 1000);
            } else if (perQuestionTimeLeft === 0) {
                handleNextQuestion();
            }
        }
        return () => clearTimeout(timer);
    }, [quizStarted, quizSubmitted, timeLeft, perQuestionTimeLeft, quiz]);
    
    // Effect to set per-question timer
    useEffect(() => {
        if (quiz && !quiz.overallTimeLimit && quiz.questions[currentQuestionIndex]) {
            setPerQuestionTimeLeft(quiz.questions[currentQuestionIndex].timeLimit);
        }
    }, [currentQuestionIndex, quiz, quizStarted]);

    const handleSignOut = () => signOut(auth).then(() => navigate('/student/login')).catch(console.error);
    const handleStartQuiz = () => setQuizStarted(true);

    const handleAnswerChange = (value) => {
        const newAnswers = [...selectedAnswers];
        newAnswers[currentQuestionIndex] = value;
        setSelectedAnswers(newAnswers);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            handleSubmitQuiz();
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
    };

    const handleSubmitQuiz = async () => {
        if (quizSubmitted || !user) return;
        setQuizSubmitted(true);
    
        let initialScore = 0;
        let requiresManualGrading = false;
    
        const detailedAnswers = quiz.questions.map((question, index) => {
            const userAnswer = selectedAnswers[index];
            let isCorrect = null;
            let pointsAwarded = null;
    
            switch (question.type) {
                case 'MCQ':
                    isCorrect = userAnswer === question.correctOption;
                    pointsAwarded = isCorrect ? (question.points || 0) : 0;
                    initialScore += pointsAwarded;
                    return { type: 'MCQ', questionText: question.text, userAnswer, isCorrect, pointsAwarded, status: 'auto_graded' };
                case 'FILL_IN_THE_BLANK':
                    const normalizedUserAnswer = question.caseSensitive ? (userAnswer || '').trim() : (userAnswer || '').trim().toLowerCase();
                    const normalizedCorrectAnswers = question.answers.map(ans => question.caseSensitive ? ans : ans.toLowerCase());
                    isCorrect = normalizedCorrectAnswers.includes(normalizedUserAnswer);
                    pointsAwarded = isCorrect ? (question.points || 0) : 0;
                    initialScore += pointsAwarded;
                    return { type: 'FILL_IN_THE_BLANK', questionText: question.text, userAnswer, isCorrect, pointsAwarded, status: 'auto_graded' };
                case 'PARAGRAPH':
                    requiresManualGrading = true;
                    return { type: 'PARAGRAPH', questionText: question.text, userAnswer, isCorrect: null, pointsAwarded: null, teacherFeedback: "", status: 'pending_review' };
                default:
                    return { type: 'UNKNOWN', questionText: question.text, userAnswer, isCorrect: null, pointsAwarded: 0, status: 'auto_graded' };
            }
        });
    
        const totalTimeSpent = quiz.overallTimeLimit ? quiz.overallTimeLimit - timeLeft : null;
    
        const resultsData = {
            quizId: quizId,
            userId: user.uid,
            userEmail: user.email,
            userName: userName,
            quizTitle: quiz.title,
            status: requiresManualGrading ? 'pending_manual_grading' : 'completed',
            initialScore: initialScore,
            manualScore: null,
            finalScore: requiresManualGrading ? null : initialScore,
            maxScore: quiz.totalPoints || 0,
            completedAt: serverTimestamp(),
            timeSpent: totalTimeSpent,
            answers: detailedAnswers
        };
    
        setFinalResults(resultsData);
    
        try {
            await addDoc(collection(db, "quiz_results"), resultsData);
        } catch (err) {
            console.error("Error saving quiz results:", err);
            setError('Failed to submit quiz. Please try again.');
            setQuizSubmitted(false); // Allow retry on failure
        }
    };
    
    // --- RENDER LOGIC ---

    const renderTimer = () => {
        const isOverallTimer = quiz && quiz.overallTimeLimit !== undefined;
        const time = isOverallTimer ? timeLeft : perQuestionTimeLeft;
        if (time === null) return '...';
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="quiz-loading-container"><div className="loading-spinner"></div><p>Loading quiz...</p></div>;
    if (error) return <div className="quiz-error-container"><h2>An Error Occurred</h2><p>{error}</p><button onClick={() => navigate('/student/dashboard')} className="return-button">Return to Dashboard</button></div>;
    if (!quiz) return <div className="quiz-error-container"><h2>Quiz Not Found</h2><p>The quiz you're looking for doesn't exist.</p><button onClick={() => navigate('/student/dashboard')} className="return-button">Return to Dashboard</button></div>;

    if (quizSubmitted) {
        return (
            <div className="take-quiz-container">
                <div className="quiz-completed-container">
                    <h1>Quiz Completed!</h1>
                    <div className="score-display">
                        <h2>{finalResults.status === 'pending_manual_grading' ? 'Initial Results' : 'Final Score'}</h2>
                        <div className="score-circle">
                            <span className="score-value">{finalResults.initialScore}</span>
                            <span className="score-divider">/</span>
                            <span className="score-max">{finalResults.maxScore}</span>
                        </div>
                        <p className="score-points-label">Points from auto-graded questions</p>
                        {finalResults.status === 'pending_manual_grading' && (
                            <p className="pending-review-text">
                                Your submission is received. Some questions require manual grading by your teacher.
                                Your final score will be available once the review is complete.
                            </p>
                        )}
                    </div>
                    <button onClick={() => navigate('/student/dashboard')} className="return-button">Return to Dashboard</button>
                </div>
            </div>
        );
    }
    
    if (!quizStarted) {
        return (
            <div className="take-quiz-container">
                <button onClick={handleSignOut} className="sign-out-top-btn">Sign Out</button>
                <div className="quiz-intro-container">
                    <h1>{quiz.title}</h1>
                    {quiz.description && <p className="quiz-description">{quiz.description}</p>}
                    <div className="quiz-info">
                        <div className="info-item"><span>Questions:</span> <strong>{quiz.questions.length}</strong></div>
                        <div className="info-item"><span>Total Points:</span> <strong>{quiz.totalPoints}</strong></div>
                        <div className="info-item"><span>Time:</span> <strong>{quiz.overallTimeLimit ? `${Math.floor(quiz.overallTimeLimit / 60)} min` : 'Per Question'}</strong></div>
                    </div>
                    <button onClick={handleStartQuiz} className="start-quiz-btn">Start Quiz</button>
                </div>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const questionTextWithBlank = currentQuestion.text.replace(/___/g, '<span class="fill-in-blank-visual"></span>');

    return (
        <div className="take-quiz-container">
            <div className="quiz-header">
                <h1>{quiz.title}</h1>
                <div className="quiz-timer">{renderTimer()}</div>
            </div>
            <div className="quiz-progress">
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}></div></div>
                <div className="progress-text">Question {currentQuestionIndex + 1} of {quiz.questions.length}</div>
            </div>
            <div className="question-container" key={currentQuestionIndex}>
                <h2 className="question-text" dangerouslySetInnerHTML={{ __html: questionTextWithBlank }}></h2>
                <div className="answer-area">
                    {currentQuestion.type === 'MCQ' && <div className="options-list">{currentQuestion.options.map((option, index) => (<div key={index} className={`option-item ${selectedAnswers[currentQuestionIndex] === index ? 'selected' : ''}`} onClick={() => handleAnswerChange(index)}><span className="option-letter">{String.fromCharCode(65 + index)}</span>{option}</div>))}</div>}
                    {currentQuestion.type === 'FILL_IN_THE_BLANK' && <input type="text" className="fill-in-blank-input" placeholder="Type your answer here..." value={selectedAnswers[currentQuestionIndex]} onChange={(e) => handleAnswerChange(e.target.value)} />}
                    {currentQuestion.type === 'PARAGRAPH' && <textarea className="paragraph-input" placeholder="Type your detailed answer here..." rows="6" value={selectedAnswers[currentQuestionIndex]} onChange={(e) => handleAnswerChange(e.target.value)} />}
                </div>
            </div>
            <div className="quiz-navigation">
                <button onClick={handlePreviousQuestion} className="nav-button prev-button" disabled={currentQuestionIndex === 0}>Previous</button>
                <button onClick={handleNextQuestion} className="nav-button next-button">{currentQuestionIndex < quiz.questions.length - 1 ? 'Next' : 'Submit Quiz'}</button>
            </div>
            <div className="question-dots">{quiz.questions.map((_, index) => (<div key={index} className={`question-dot ${index === currentQuestionIndex ? 'active' : ''} ${selectedAnswers[index] ? 'answered' : ''}`} onClick={() => setCurrentQuestionIndex(index)}></div>))}</div>
        </div>
    );
};

export default TakeQuiz;