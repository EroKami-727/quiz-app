import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/Teacher/CreateQuiz.css';
import { FaTrashAlt, FaPlus, FaClipboard, FaTimes } from 'react-icons/fa';

// Default structures with points, no per-question timeLimit
const defaultMCQ = { type: 'MCQ', text: '', options: ['', '', '', ''], correctOption: 0, points: 10 };
const defaultFillBlank = { type: 'FILL_IN_THE_BLANK', text: '', answers: [], caseSensitive: false, points: 10 };
const defaultParagraph = { type: 'PARAGRAPH', text: '', gradingKeywords: [], points: 20 };

const CreateQuiz = () => {
    const navigate = useNavigate();
    const auth = getAuth();

    // State Management
    const [user, setUser] = useState(null);
    const [userDisplayName, setUserDisplayName] = useState('');
    const [loading, setLoading] = useState(true);

    const [quizTitle, setQuizTitle] = useState('');
    const [quizDescription, setQuizDescription] = useState('');
    const [overallTimeLimit, setOverallTimeLimit] = useState(300); // Only overall time limit
    const [questions, setQuestions] = useState([{ ...defaultMCQ }]);

    const [isPublished, setIsPublished] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                setUserDisplayName(userDocSnap.exists() ? userDocSnap.data().displayName || 'Teacher' : 'Teacher');
            } else {
                setUser(null);
                navigate('/teacher/login');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [auth, navigate]);

    // Helper Functions
    const generateQuizCode = () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').sort(() => 0.5 - Math.random()).join('').slice(0, 6);
    const handleSignOut = () => signOut(auth).then(() => navigate('/teacher/login')).catch(console.error);
    const handleAddQuestion = () => setQuestions([...questions, { ...defaultMCQ }]);

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
        let newQuestionData;
        // Preserve text and points when changing type
        const commonProps = { text: currentQuestion.text, points: currentQuestion.points };
        switch (newType) {
            case 'FILL_IN_THE_BLANK': newQuestionData = { ...defaultFillBlank, ...commonProps }; break;
            case 'PARAGRAPH': newQuestionData = { ...defaultParagraph, ...commonProps }; break;
            default: newQuestionData = { ...defaultMCQ, ...commonProps }; break;
        }
        newQuestions[index] = newQuestionData;
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

    const validateQuiz = () => {
        if (!quizTitle.trim()) {
            setError("Quiz title is required.");
            return false;
        }
        for (const q of questions) {
            if (!q.text.trim()) {
                setError("All questions must have text.");
                return false;
            }
            if ((q.points || 0) <= 0) {
                setError("All questions must have points greater than 0.");
                return false;
            }
        }
        setError('');
        return true;
    };

    const handlePublishQuiz = async () => {
        if (!validateQuiz()) return;
        setIsSubmitting(true);

        try {
            const quizCode = generateQuizCode();
            const totalPoints = questions.reduce((sum, q) => sum + (parseInt(q.points, 10) || 0), 0);

            const quizData = {
                title: quizTitle,
                description: quizDescription,
                code: quizCode,
                createdBy: user.uid,
                username: userDisplayName,
                createdAt: serverTimestamp(),
                active: true,
                overallTimeLimit: Math.max(10, parseInt(overallTimeLimit, 10) || 300),
                totalPoints: totalPoints,
                questions: questions.map(q => {
                    const questionToSave = {
                        type: q.type,
                        text: q.text,
                        points: parseInt(q.points, 10) || 0
                    };
                    switch (q.type) {
                        case 'MCQ':
                            questionToSave.options = q.options;
                            questionToSave.correctOption = q.correctOption;
                            break;
                        case 'FILL_IN_THE_BLANK':
                            questionToSave.answers = q.answers.filter(Boolean);
                            questionToSave.caseSensitive = q.caseSensitive;
                            break;
                        case 'PARAGRAPH':
                            questionToSave.gradingKeywords = q.gradingKeywords.filter(Boolean);
                            break;
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
        setQuestions([{ ...defaultMCQ }]);
        setOverallTimeLimit(300);
        setIsPublished(false);
        setGeneratedCode('');
        setSuccessMessage('');
        setError('');
    };

    if (loading) return <div className="loading-screen">Loading...</div>;

    // --- RENDER LOGIC ---
    return (
        <div className="create-quiz-container">
            <button onClick={handleSignOut} className="sign-out-top-btn">Sign Out</button>
            <div className="create-quiz-content">
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
                            <div className="section-header"><h2>2. Questions</h2></div>
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} className="question-card">
                                    <div className="question-header">
                                        <h3>Question {qIndex + 1}</h3>
                                        <div className="question-controls">
                                            <select value={q.type} onChange={(e) => handleQuestionTypeChange(qIndex, e.target.value)} className="question-type-select">
                                                <option value="MCQ">Multiple Choice</option>
                                                <option value="FILL_IN_THE_BLANK">Fill in the Blank</option>
                                                <option value="PARAGRAPH">Paragraph</option>
                                            </select>
                                            <button onClick={() => handleRemoveQuestion(qIndex)} className="remove-question-btn" type="button" disabled={questions.length === 1}><FaTrashAlt /></button>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor={`question-text-${qIndex}`}>Question Text</label>
                                        <input id={`question-text-${qIndex}`} type="text" value={q.text} onChange={(e) => handleQuestionFieldChange(qIndex, 'text', e.target.value)} placeholder="e.g., The powerhouse of the cell is the ___." className="form-control" />
                                        {q.type === 'FILL_IN_THE_BLANK' && <small className="input-instruction">Use three underscores <code>___</code> to show students where the blank is.</small>}
                                    </div>

                                    {/* Question Body with Points Input */}
                                    <div className="question-body">
                                        <div className="form-group points-group">
                                            <label htmlFor={`question-points-${qIndex}`}>Points</label>
                                            <input id={`question-points-${qIndex}`} type="number" value={q.points} onChange={(e) => handleQuestionFieldChange(qIndex, 'points', e.target.value)} onBlur={(e) => handleQuestionFieldChange(qIndex, 'points', Math.max(1, parseInt(e.target.value, 10) || 1))} className="form-control points-input" />
                                        </div>

                                        {q.type === 'MCQ' && <div className="options-container slide-down">{/* ... MCQ options JSX ... */}</div>}
                                        {q.type === 'FILL_IN_THE_BLANK' && <div className="fill-blank-container slide-down">{/* ... FillBlank JSX ... */}</div>}
                                        {q.type === 'PARAGRAPH' && <div className="paragraph-container slide-down">{/* ... Paragraph JSX ... */}</div>}
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddQuestion} className="add-question-btn" type="button"><FaPlus /> Add Another Question</button>
                        </div>
                        {error && <div className="error-message"><FaTimes /> {error}</div>}
                        <div className="form-actions"><button onClick={handlePublishQuiz} className="publish-quiz-btn" type="button" disabled={isSubmitting}>{isSubmitting ? 'Publishing...' : 'Publish Quiz'}</button></div>
                    </>
                ) : (
                     <div className="quiz-published-section">{/* ... Published JSX ... */}</div>
                )}
            </div>
        </div>
    );
};

export default CreateQuiz;