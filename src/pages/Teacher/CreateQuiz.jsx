import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/Teacher/CreateQuiz.css';
import { FaTrashAlt, FaPlus, FaClipboard, FaTimes } from 'react-icons/fa';

// Default structures for each question type
const defaultMCQ = { type: 'MCQ', text: '', options: ['', '', '', ''], correctOption: 0, timeLimit: 30 };
const defaultFillBlank = { type: 'FILL_IN_THE_BLANK', text: '', answers: [], caseSensitive: false, timeLimit: 30 };
const defaultParagraph = { type: 'PARAGRAPH', text: '', gradingKeywords: [], timeLimit: 180 };

const CreateQuiz = () => {
    const navigate = useNavigate();
    const auth = getAuth();

    // State Management
    const [user, setUser] = useState(null);
    const [userDisplayName, setUserDisplayName] = useState('');
    const [loading, setLoading] = useState(true);

    const [quizTitle, setQuizTitle] = useState('');
    const [quizDescription, setQuizDescription] = useState('');
    const [timeLimitType, setTimeLimitType] = useState('OVERALL');
    const [overallTimeLimit, setOverallTimeLimit] = useState(300);

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
        switch (newType) {
            case 'FILL_IN_THE_BLANK': newQuestionData = { ...defaultFillBlank, text: currentQuestion.text, timeLimit: currentQuestion.timeLimit }; break;
            case 'PARAGRAPH': newQuestionData = { ...defaultParagraph, text: currentQuestion.text, timeLimit: currentQuestion.timeLimit }; break;
            default: newQuestionData = { ...defaultMCQ, text: currentQuestion.text, timeLimit: currentQuestion.timeLimit }; break;
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
        newQuestions[qIndex][field] = value.split(',');
        setQuestions(newQuestions);
    };

    const validateQuiz = () => { /* Add your validation logic here */ return true; };

    const handlePublishQuiz = async () => {
        if (!validateQuiz()) return;
        setIsSubmitting(true);
        try {
            const quizCode = generateQuizCode();
            const quizData = {
                title: quizTitle,
                description: quizDescription,
                code: quizCode,
                createdBy: user.uid,
                username: userDisplayName,
                createdAt: serverTimestamp(),
                active: true,
                questions: questions.map(q => {
                    const questionToSave = { type: q.type, text: q.text };
                    if (timeLimitType === 'PER_QUESTION') {
                        questionToSave.timeLimit = Math.max(10, parseInt(q.timeLimit) || 30);
                    }
                    switch (q.type) {
                        case 'MCQ':
                            questionToSave.options = q.options;
                            questionToSave.correctOption = q.correctOption;
                            break;
                        case 'FILL_IN_THE_BLANK':
                            questionToSave.answers = q.answers.map(a => a.trim()).filter(Boolean);
                            questionToSave.caseSensitive = q.caseSensitive;
                            break;
                        case 'PARAGRAPH':
                            questionToSave.gradingKeywords = q.gradingKeywords.map(k => k.trim()).filter(Boolean);
                            break;
                        default: break;
                    }
                    return questionToSave;
                }),
            };
            if (timeLimitType === 'OVERALL') {
                quizData.overallTimeLimit = Math.max(10, parseInt(overallTimeLimit) || 300);
            }
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
        setTimeLimitType('OVERALL');
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
                        </div>

                        <div className="quiz-form-section">
                            <div className="section-header"><h2>2. Time Limit</h2></div>
                            <div className="time-limit-selector">
                                <label className={timeLimitType === 'OVERALL' ? 'active' : ''}>
                                    <input type="radio" name="timeLimitType" value="OVERALL" checked={timeLimitType === 'OVERALL'} onChange={() => setTimeLimitType('OVERALL')} />
                                    Overall Quiz Timer
                                </label>
                                <label className={timeLimitType === 'PER_QUESTION' ? 'active' : ''}>
                                    <input type="radio" name="timeLimitType" value="PER_QUESTION" checked={timeLimitType === 'PER_QUESTION'} onChange={() => setTimeLimitType('PER_QUESTION')} />
                                    Per-Question Timer
                                </label>
                            </div>
                            {timeLimitType === 'OVERALL' && (
                                <div className="form-group slide-down">
                                    <label htmlFor="overall-time-limit">Overall Time Limit (seconds)</label>
                                    <input
                                        id="overall-time-limit"
                                        type="number"
                                        value={overallTimeLimit}
                                        onChange={(e) => setOverallTimeLimit(e.target.value)}
                                        onBlur={(e) => setOverallTimeLimit(Math.max(10, parseInt(e.target.value) || 10))}
                                        className="form-control"
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="quiz-questions-section">
                            <div className="section-header"><h2>3. Questions</h2></div>
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
                                        <input
                                            id={`question-text-${qIndex}`}
                                            type="text"
                                            value={q.text}
                                            onChange={(e) => handleQuestionFieldChange(qIndex, 'text', e.target.value)}
                                            placeholder="e.g., The powerhouse of the cell is the ___."
                                            className="form-control"
                                        />
                                        {q.type === 'FILL_IN_THE_BLANK' && (
                                            <small className="input-instruction">
                                                Use three underscores <code>___</code> to show students where the blank is.
                                            </small>
                                        )}
                                    </div>
                                    <div className="question-body">
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
                                                    <input
                                                        id={`fill-answers-${qIndex}`}
                                                        type="text"
                                                        value={q.answers.join(',')}
                                                        onChange={(e) => handleCommaSeparatedChange(qIndex, 'answers', e.target.value)}
                                                        placeholder="e.g., mitochondria,Mitochondria"
                                                        className="form-control"
                                                    />
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
                                                    <label htmlFor={`keywords-${qIndex}`}>Grading Keywords (Optional, comma-separated)</label>
                                                    <input
                                                        id={`keywords-${qIndex}`}
                                                        type="text"
                                                        value={q.gradingKeywords.join(',')}
                                                        onChange={(e) => handleCommaSeparatedChange(qIndex, 'gradingKeywords', e.target.value)}
                                                        placeholder="e.g., sunlight, chlorophyll, oxygen"
                                                        className="form-control"
                                                    />
                                                    <small>These keywords will be shown to you during grading.</small>
                                                </div>
                                            </div>
                                        )}
                                        {timeLimitType === 'PER_QUESTION' && (
                                            <div className="form-group per-question-time-limit slide-down">
                                                <label htmlFor={`q-time-limit-${qIndex}`}>Time Limit for this question (seconds)</label>
                                                <input
                                                    id={`q-time-limit-${qIndex}`}
                                                    type="number"
                                                    value={q.timeLimit}
                                                    onChange={(e) => handleQuestionFieldChange(qIndex, 'timeLimit', e.target.value)}
                                                    onBlur={(e) => handleQuestionFieldChange(qIndex, 'timeLimit', Math.max(10, parseInt(e.target.value) || 10))}
                                                    className="form-control"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddQuestion} className="add-question-btn" type="button"><FaPlus /> Add Another Question</button>
                        </div>
                        {error && <div className="error-message"><FaTimes /> {error}</div>}
                        <div className="form-actions">
                            <button onClick={handlePublishQuiz} className="publish-quiz-btn" type="button" disabled={isSubmitting}>{isSubmitting ? 'Publishing...' : 'Publish Quiz'}</button>
                        </div>
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
                        <button onClick={handleCreateNewQuiz} className="new-quiz-btn" type="button">
                            Create Another Quiz
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateQuiz;