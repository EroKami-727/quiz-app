import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import MediaRenderer from '../../components/MediaRenderer';
import '../../styles/Student/ResultDetails.css';
import { FaArrowLeft, FaCheck, FaTimes } from 'react-icons/fa';

const ResultDetails = () => {
    const { resultId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [resultData, setResultData] = useState(null);
    const [quizData, setQuizData] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!resultId) { setError("Result ID not found."); setLoading(false); return; }
            setLoading(true);
            try {
                const resultDocRef = doc(db, "quiz_results", resultId);
                const resultDocSnap = await getDoc(resultDocRef);
                if (!resultDocSnap.exists()) { throw new Error("Result not found."); }
                const result = resultDocSnap.data();
                setResultData(result);

                const quizDocRef = doc(db, "quizzes", result.quizId);
                const quizDocSnap = await getDoc(quizDocRef);
                if (!quizDocSnap.exists()) { throw new Error("Original quiz could not be found."); }
                setQuizData(quizDocSnap.data());
            } catch (err) { console.error("Error fetching result details:", err); setError(err.message); } 
            finally { setLoading(false); }
        };
        fetchDetails();
    }, [resultId]);

    const getAnswerDisplay = (question, userAnswer) => {
        if (userAnswer === null || userAnswer === undefined) return <p className="review-no-answer">No answer provided</p>;
        switch (question.type) {
            case 'MCQ':
                return (userAnswer || []).map(id => {
                    const option = question.mcqData.options.find(opt => opt.id === id);
                    return <div key={id} className="review-answer-item">{option?.text}<MediaRenderer media={option?.media} transform="thumbnail"/></div>;
                });
            case 'MATCH_THE_FOLLOWING':
                return question.matchData.pairs.map(pair => (
                    <div key={pair.id} className="review-match-item">
                        <div className="review-match-prompt">{pair.prompt}<MediaRenderer media={pair.promptMedia} transform="thumbnail"/></div>
                        <span>→</span>
                        <div className="review-match-answer">{userAnswer.pairs?.[pair.id]?.answerText || 'Unanswered'}<MediaRenderer media={userAnswer.pairs?.[pair.id]?.answerMedia} transform="thumbnail"/></div>
                    </div>
                ));
            default: return <p>{String(userAnswer)}</p>;
        }
    };
    
    const getCorrectAnswerDisplay = (question) => {
        switch (question.type) {
            case 'MCQ':
                return question.mcqData.correctOptions.map(id => {
                    const option = question.mcqData.options.find(opt => opt.id === id);
                    return <div key={id} className="review-answer-item">{option?.text}<MediaRenderer media={option?.media} transform="thumbnail"/></div>;
                });
            case 'FILL_IN_THE_BLANK':
                return (question.fillBlankData.answers || []).map(ans => ans.text).join(' / ');
            default: return "N/A for this question type";
        }
    }

    if (loading) return <div className="details-loading-screen"><div></div><p>Loading Review...</p></div>;
    if (error) return <div className="details-error-screen">{error}</div>;

    return (
        <div className="result-details-container">
            <div className="result-details-header">
                <button onClick={() => navigate('/student/your-results')} className="back-button"><FaArrowLeft /> Back to Results</button>
                <h1>Review: {quizData?.title}</h1>
                <div className="final-score-badge">Final Score: {resultData.finalScore} / {resultData.maxScore}</div>
            </div>
            <div className="review-questions-list">
                {quizData?.questions.map((question, index) => {
                    const studentAnswer = resultData.answers[index];
                    const statusClass = studentAnswer.status === 'pending_review' ? 'pending' : (studentAnswer.isCorrect ? 'correct' : 'incorrect');
                    return (
                        <div key={question.id} className={`review-question-card ${statusClass}`}>
                            <div className="review-card-header">
                                <div className="review-q-title">
                                    <span className="review-question-number">Q{index + 1}</span>
                                    <h3>{question.questionText}</h3>
                                </div>
                                <span className="review-question-points">{studentAnswer.pointsAwarded} / {question.points} Pts</span>
                            </div>
                            <MediaRenderer media={question.media} transform="question_main" />
                            <div className="review-answers-container">
                                <div className="answer-box user-answer">
                                    <label>Your Answer</label>
                                    <div>{getAnswerDisplay(question, studentAnswer.userAnswer)}</div>
                                </div>
                                {statusClass === 'incorrect' && (
                                     <div className="answer-box correct-answer">
                                        <label>Correct Answer</label>
                                        <div>{getCorrectAnswerDisplay(question)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ResultDetails;