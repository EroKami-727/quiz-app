import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/Teacher/CreateQuiz.css';
import { FaTrashAlt, FaPlus, FaClipboard, FaTimes, FaArrowLeft } from 'react-icons/fa';

// Default structures for each question type
const defaultMCQ = { type: 'MCQ', text: '', options: ['', '', '', ''], correctOption: 0, points: 10 };
const defaultFillBlank = { type: 'FILL_IN_THE_BLANK', text: '', answers: [], caseSensitive: false, points: 10 };
const defaultParagraph = { type: 'PARAGRAPH', text: '', gradingKeywords: [], points: 20 };

const CreateQuiz = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = getAuth();
    const { currentUser } = useAuth();

    const [quizType, setQuizType] = useState(location.state?.quizType || 'MIXED');

    const getInitialQuestion = (type) => {
        switch (type) {
            case 'MCQ': return { ...defaultMCQ };
            case 'FILL_IN_THE_BLANK': return { ...defaultFillBlank };
            case 'PARAGRAPH': return { ...defaultParagraph };
            default: return { ...defaultMCQ };
        }
    };

    // State Management
    const [userDisplayName, setUserDisplayName] = useState('');
    const [loading, setLoading] = useState(true);
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDescription, setQuizDescription] = useState('');
    const [overallTimeLimit, setOverallTimeLimit] = useState(300);
    const [questions, setQuestions] = useState([getInitialQuestion(quizType)]);
    const [isPublished, setIsPublished] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (currentUser) {
            const fetchUserData = async () => {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                setUserDisplayName(userDocSnap.exists() ? userDocSnap.data().displayName || 'Teacher' : 'Teacher');
                setLoading(false);
            };
            fetchUserData();
        }
    }, [currentUser]);

    const generateQuizCode = () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').sort(() => 0.5 - Math.random()).join('').slice(0, 6);
    const handleSignOut = () => signOut(auth).then(() => navigate('/teacher/login')).catch(console.error);

    const handleAddQuestion = () => {
        const newQuestionType = quizType === 'MIXED' ? 'MCQ' : quizType;
        setQuestions([...questions, getInitialQuestion(newQuestionType)]);
    };

    const handleRemoveQuestion = (index) => {
        if (questions.length > 1) {
            setQuestions(questions.filter((_, i) => i !== index));
        } else {
            setError('A quiz must have at least one question.');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleQuestionFieldChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const handleQuestionTypeChange = (index, newType) => {
        const newQuestions = [...questions];
        const currentQuestion = newQuestions[index];
        const commonProps = { text: currentQuestion.text, points: currentQuestion.points };
        switch (newType) {
            case 'FILL_IN_THE_BLANK': newQuestions[index] = { ...defaultFillBlank, ...commonProps }; break;
            case 'PARAGRAPH': newQuestions[index] = { ...defaultParagraph, ...commonProps }; break;
            default: newQuestions[index] = { ...defaultMCQ, ...commonProps }; break;
        }
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleCommaSeparatedChange = (qIndex, field, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex][field] = value.split(',').map(item => item.trim());
        setQuestions(newQuestions);
    };

    const validateQuiz = () => { /* ...validation logic... */ return true; };

    const handlePublishQuiz = async () => {
        if (!validateQuiz() || !currentUser) return;
        setIsSubmitting(true);
        try {
            const quizCode = generateQuizCode();
            const totalPoints = questions.reduce((sum, q) => sum + (parseInt(q.points, 10) || 0), 0);
            const quizData = {
                title: quizTitle,
                description: quizDescription,
                code: quizCode,
                quizType: quizType,
                createdBy: currentUser.uid,
                username: userDisplayName,
                createdAt: serverTimestamp(),
                active: true,
                overallTimeLimit: Math.max(10, parseInt(overallTimeLimit, 10) || 300),
                totalPoints: totalPoints,
                questions: questions.map(q => {
                    const questionToSave = { type: q.type, text: q.text, points: parseInt(q.points, 10) || 0 };
                    switch (q.type) {
                        case 'MCQ': questionToSave.options = q.options; questionToSave.correctOption = q.correctOption; break;
                        case 'FILL_IN_THE_BLANK': questionToSave.answers = q.answers.filter(Boolean); questionToSave.caseSensitive = q.caseSensitive; break;
                        case 'PARAGRAPH': questionToSave.gradingKeywords = q.gradingKeywords.filter(Boolean); break;
                        default: break;
                    }
                    return questionToSave;
                }),
            };
            await addDoc(collection(db, "quizzes"), quizData);
            setGeneratedCode(quizCode);
            setIsPublished(true);
            setSuccessMessage('Quiz published successfully!');
        } catch (e) {
            console.error("Error publishing quiz: ", e);
            setError('Error publishing quiz. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateNewQuiz = () => {
        setQuizTitle('');
        setQuizDescription('');
        setQuestions([getInitialQuestion(quizType)]);
        setOverallTimeLimit(300);
        setIsPublished(false);
        setGeneratedCode('');
        setSuccessMessage('');
        setError('');
    };

    if (loading) return <div className="loading-screen">Loading...</div>;

    return (
        <div className="create-quiz-container">
            <button onClick={handleSignOut} className="sign-out-top-btn">Sign Out</button>
            <div className="create-quiz-content">
                <button onClick={() => navigate('/teacher/home')} className="back-btn"><FaArrowLeft /> Back to Dashboard</button>
                
                {!isPublished ? (
                    <>
                        <div className="quiz-form-section">
                            <div className="section-header"><h2>1. Quiz Details</h2></div>
                            <div className="form-group">
                                <label htmlFor="quiz-title">Quiz Title</label>
                                <input id="quiz-title" type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="e.g., Chapter 5: Photosynthesis" className="form-control" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="quiz-description">Description (Optional)</label>
                                <textarea id="quiz-description" value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)} placeholder="A brief summary of the quiz content" className="form-control" rows="3" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="overall-time-limit">Overall Time Limit (seconds)</label>
                                <input id="overall-time-limit" type="number" value={overallTimeLimit} onChange={(e) => setOverallTimeLimit(e.target.value)} onBlur={(e) => setOverallTimeLimit(Math.max(10, parseInt(e.target.value, 10) || 10))} className="form-control" />
                            </div>
                        </div>
                        
                        <div className="quiz-questions-section">
                            <div className="section-header"><h2>2. Questions ({quizType.replace(/_/g, ' ')})</h2></div>
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} className="question-card">
                                    <div className="question-header">
                                        <h3>Question {qIndex + 1}</h3>
                                        <div className="question-controls">
                                            {quizType === 'MIXED' && (
                                                <select value={q.type} onChange={(e) => handleQuestionTypeChange(qIndex, e.target.value)} className="question-type-select">
                                                    <option value="MCQ">Multiple Choice</option>
                                                    <option value="FILL_IN_THE_BLANK">Fill in the Blank</option>
                                                    <option value="PARAGRAPH">Paragraph</option>
                                                </select>
                                            )}
                                            <button onClick={() => handleRemoveQuestion(qIndex)} className="remove-question-btn" type="button" disabled={questions.length === 1}><FaTrashAlt /></button>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor={`question-text-${qIndex}`}>Question Text</label>
                                        <input id={`question-text-${qIndex}`} type="text" value={q.text} onChange={(e) => handleQuestionFieldChange(qIndex, 'text', e.target.value)} placeholder="e.g., The powerhouse of the cell is the ___." className="form-control" />
                                        {q.type === 'FILL_IN_THE_BLANK' && <small className="input-instruction">Use underscores <code>___</code> to show students where the blank is.</small>}
                                    </div>
                                    <div className="question-body">
                                        <div className="form-group points-group">
                                            <label htmlFor={`question-points-${qIndex}`}>Points</label>
                                            <input id={`question-points-${qIndex}`} type="number" value={q.points} onChange={(e) => handleQuestionFieldChange(qIndex, 'points', e.target.value)} onBlur={(e) => handleQuestionFieldChange(qIndex, 'points', Math.max(1, parseInt(e.target.value, 10) || 1))} className="form-control points-input" />
                                        </div>
                                        {q.type === 'MCQ' && (
                                            <div className="options-container slide-down">
                                                <h4>Options (Mark the correct one)</h4>
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className="option-item">
                                                        <input id={`correct-option-${qIndex}-${oIndex}`} type="radio" name={`correct-option-${qIndex}`} checked={q.correctOption === oIndex} onChange={() => handleQuestionFieldChange(qIndex, 'correctOption', oIndex)} className="form-check-input" />
                                                        <input type="text" value={opt} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="form-control" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === 'FILL_IN_THE_BLANK' && (
                                            <div className="fill-blank-container slide-down">
                                                <div className="form-group">
                                                    <label htmlFor={`fill-answers-${qIndex}`}>Acceptable Answers (comma-separated)</label>
                                                    <input id={`fill-answers-${qIndex}`} type="text" value={q.answers.join(',')} onChange={(e) => handleCommaSeparatedChange(qIndex, 'answers', e.target.value)} placeholder="e.g., mitochondria,Mitochondria" className="form-control"/>
                                                </div>
                                                <div className="form-check-inline">
                                                    <input id={`case-sensitive-${qIndex}`} type="checkbox" checked={q.caseSensitive} onChange={(e) => handleQuestionFieldChange(qIndex, 'caseSensitive', e.target.checked)} />
                                                    <label htmlFor={`case-sensitive-${qIndex}`}>Answers are case-sensitive</label>
                                                </div>
                                            </div>
                                        )}
                                        {q.type === 'PARAGRAPH' && (
                                            <div className="paragraph-container slide-down">
                                                <div className="form-group">
                                                    <label htmlFor={`keywords-${qIndex}`}>Grading Keywords (Optional)</label>
                                                    <input id={`keywords-${qIndex}`} type="text" value={q.gradingKeywords.join(',')} onChange={(e) => handleCommaSeparatedChange(qIndex, 'gradingKeywords', e.target.value)} placeholder="e.g., sunlight, chlorophyll, oxygen" className="form-control" />
                                                    <small className="input-instruction">These keywords will be shown to you during grading.</small>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddQuestion} className="add-question-btn" type="button"><FaPlus /> Add Another Question</button>
                        </div>
                        {error && <div className="error-message"><FaTimes /> {error}</div>}
                        <div className="form-actions"><button onClick={handlePublishQuiz} className="publish-quiz-btn" type="button" disabled={isSubmitting}>{isSubmitting ? 'Publishing...' : 'Publish Quiz'}</button></div>
                    </>
                ) : (
                    <div className="quiz-published-section">
                        <div className="success-message">{successMessage}</div>
                        <div className="quiz-code-container">
                            <h2>Your Quiz Code</h2>
                            <div className="quiz-code">{generatedCode}</div>
                            <p>Share this code with students for them to join.</p>
                            <button onClick={() => { navigator.clipboard.writeText(generatedCode); setSuccessMessage('Code Copied!'); setTimeout(() => setSuccessMessage('Quiz published successfully!'), 2000); }} className="copy-code-btn" type="button">
                                <FaClipboard /> Copy Code
                            </button>
                        </div>
                        <button onClick={handleCreateNewQuiz} className="new-quiz-btn" type="button">Create Another Quiz</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateQuiz;