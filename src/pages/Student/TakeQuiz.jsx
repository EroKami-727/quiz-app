import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import '../../styles/Student/TakeQuiz.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Helper to shuffle an array
const shuffleArray = (array) => {
    if (!array || !Array.isArray(array)) return [];
    return [...array].sort(() => Math.random() - 0.5);
};

const TakeQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;

    const [quiz, setQuiz] = useState(null);
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState([]);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [finalResults, setFinalResults] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    
    // --- FIX: State to hold shuffled options persistently for the quiz session ---
    const [shuffledQuestionOptions, setShuffledQuestionOptions] = useState({});

    // Fetch Quiz Data
    useEffect(() => {
        const fetchQuiz = async () => {
            setLoading(true);
            try {
                const quizDocRef = doc(db, "quizzes", quizId);
                const quizDocSnap = await getDoc(quizDocRef);

                if (quizDocSnap.exists()) {
                    const quizData = quizDocSnap.data();
                    setQuiz(quizData);
                    
                    // --- FIX: Initialize shuffled lists for relevant questions ---
                    const shufflers = {};
                    (quizData.questions || []).forEach((q, index) => {
                        if (q.type === 'MATCH_THE_FOLLOWING') {
                            shufflers[index] = shuffleArray(q.options);
                        }
                    });
                    setShuffledQuestionOptions(shufflers);

                    const initialAnswers = (quizData.questions || []).map(q => {
                        switch(q.type) {
                            case 'MATCH_THE_FOLLOWING': return {};
                            case 'REORDER': return shuffleArray(q.items ?? []);
                            case 'CATEGORIZE': 
                                return {
                                    ...Object.fromEntries((q.categories ?? []).map(cat => [cat, []])),
                                    bank: shuffleArray((q.items ?? []).map(item => item.text))
                                };
                            case 'READING_COMPREHENSION': return new Array(q.subQuestions?.length ?? 0).fill('');
                            default: return '';
                        }
                    });
                    setSelectedAnswers(initialAnswers);
                    
                    if (quizData.overallTimeLimit) setTimeLeft(quizData.overallTimeLimit);
                } else {
                    setError('Quiz not found. It might have been deleted or the link is incorrect.');
                }
            } catch (err) {
                console.error("Error fetching quiz:", err);
                setError('Failed to load quiz. The data might be corrupted.');
            } finally {
                setLoading(false);
            }
        };
        if (quizId) fetchQuiz();
    }, [quizId]);

    // Fetch User Data
    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    setUserName(userDocSnap.exists() ? userDocSnap.data().displayName || user.email : user.email);
                } catch (err) {
                    console.error("Error fetching user data:", err);
                    setUserName(user.email);
                }
            }
        };
        fetchUserData();
    }, [user]);

    // Timer logic
    useEffect(() => {
        if (!quizStarted || quizSubmitted || !quiz || timeLeft === null) return;
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0) {
            handleSubmitQuiz();
        }
    }, [quizStarted, quizSubmitted, timeLeft, quiz]);

    const handleSignOut = () => signOut(auth).then(() => navigate('/student/login')).catch(console.error);
    const handleStartQuiz = () => setQuizStarted(true);

    const handleAnswerChange = (value, subIndex = null) => {
        const newAnswers = [...selectedAnswers];
        if (subIndex !== null && Array.isArray(newAnswers[currentQuestionIndex])) {
            newAnswers[currentQuestionIndex][subIndex] = value;
        } else {
            newAnswers[currentQuestionIndex] = value;
        }
        setSelectedAnswers(newAnswers);
    };

    const handleDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;

        const currentQuestion = quiz.questions[currentQuestionIndex];
        const newAnswers = [...selectedAnswers];
        let currentAnswer = newAnswers[currentQuestionIndex];

        if (currentQuestion.type === 'REORDER') {
            const reorderedItems = Array.from(currentAnswer);
            const [removed] = reorderedItems.splice(source.index, 1);
            reorderedItems.splice(destination.index, 0, removed);
            newAnswers[currentQuestionIndex] = reorderedItems;
        }

        if (currentQuestion.type === 'CATEGORIZE') {
            const newBoardState = { ...currentAnswer };
            const sourceColumn = newBoardState[source.droppableId];
            const destColumn = newBoardState[destination.droppableId];
            if(source.droppableId === destination.droppableId) {
                const newItems = Array.from(sourceColumn);
                const [removed] = newItems.splice(source.index, 1);
                newItems.splice(destination.index, 0, removed);
                newBoardState[source.droppableId] = newItems;
            } else {
                const newSourceItems = Array.from(sourceColumn);
                const newDestItems = Array.from(destColumn);
                const [removed] = newSourceItems.splice(source.index, 1);
                newDestItems.splice(destination.index, 0, removed);
                newBoardState[source.droppableId] = newSourceItems;
                newBoardState[destination.droppableId] = newDestItems;
            }
            newAnswers[currentQuestionIndex] = newBoardState;
        }
        
        // --- FIX: Logic to prevent `undefined` values from being set ---
        if (currentQuestion.type === 'MATCH_THE_FOLLOWING') {
            const newMatchState = { ...currentAnswer };
            const sourceId = source.droppableId;
            const destId = destination.droppableId;
            if (sourceId === destId) return;

            const sourcePrompt = sourceId.startsWith('prompt-') ? sourceId.replace('prompt-', '') : null;
            const destPrompt = destId.startsWith('prompt-') ? destId.replace('prompt-', '') : null;
            const itemInDest = destPrompt ? newMatchState[destPrompt] : undefined;

            // Remove from old location
            if (sourcePrompt) {
                delete newMatchState[sourcePrompt];
            }
            // Add to new location
            if (destPrompt) {
                newMatchState[destPrompt] = draggableId;
            }
            // If an item was swapped out, put it where the dragged item came from
            if (itemInDest && sourcePrompt) {
                 newMatchState[sourcePrompt] = itemInDest;
            }
            
            newAnswers[currentQuestionIndex] = newMatchState;
        }

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
            let pointsAwarded = 0;
            let status = 'auto_graded';

            switch (question.type) {
                case 'MCQ':
                    pointsAwarded = userAnswer === question.correctOption ? (question.points || 0) : 0;
                    break;
                case 'FILL_IN_THE_BLANK':
                    const normUserAns = question.caseSensitive ? (userAnswer || '').trim() : (userAnswer || '').trim().toLowerCase();
                    const normCorrectAns = (question.answers || []).map(ans => question.caseSensitive ? ans : ans.toLowerCase());
                    pointsAwarded = normCorrectAns.includes(normUserAns) ? (question.points || 0) : 0;
                    break;
                case 'PARAGRAPH':
                    requiresManualGrading = true;
                    status = 'pending_review';
                    break;
                case 'REORDER':
                    const isCorrectOrder = userAnswer && question.items && JSON.stringify(userAnswer) === JSON.stringify(question.items);
                    pointsAwarded = isCorrectOrder ? (question.points || 0) : 0;
                    break;
                case 'MATCH_THE_FOLLOWING':
                    let correctMatches = 0;
                    if(question.correctMatches && userAnswer) {
                        Object.entries(question.correctMatches).forEach(([prompt, correctOpt]) => {
                            if (userAnswer[prompt] === correctOpt) correctMatches++;
                        });
                    }
                    pointsAwarded = (question.prompts?.length > 0) ? Math.round((correctMatches / question.prompts.length) * (question.points || 0)) : 0;
                    break;
                case 'CATEGORIZE':
                    let correctCategorizations = 0;
                    if(question.items && userAnswer) {
                        question.items.forEach(item => {
                            // --- FIX: Correctly check for string equality in the array ---
                            const studentCategory = Object.keys(userAnswer).find(cat => cat !== 'bank' && userAnswer[cat]?.includes(item.text));
                            if(studentCategory === item.category) correctCategorizations++;
                        });
                    }
                    pointsAwarded = (question.items?.length > 0) ? Math.round((correctCategorizations / question.items.length) * (question.points || 0)) : 0;
                    break;
                case 'READING_COMPREHENSION':
                    if (question.subQuestions && userAnswer) {
                        question.subQuestions.forEach((subQ, subIndex) => {
                           if (subQ.type === 'MCQ' && userAnswer[subIndex] === subQ.correctOption) {
                               pointsAwarded += (subQ.points || 0);
                           }
                        });
                    }
                    break;
            }
            initialScore += pointsAwarded;
            return { type: question.type, questionText: question.text, userAnswer, pointsAwarded, status };
        });
    
        const resultsData = {
            quizId, userId: user.uid, userEmail: user.email, userName,
            quizTitle: quiz.title,
            status: requiresManualGrading ? 'pending_manual_grading' : 'completed',
            initialScore, finalScore: requiresManualGrading ? null : initialScore,
            maxScore: quiz.totalPoints || 0,
            completedAt: serverTimestamp(),
            timeSpent: quiz.overallTimeLimit ? quiz.overallTimeLimit - timeLeft : null,
            answers: detailedAnswers
        };
    
        setFinalResults(resultsData);
    
        try {
            await addDoc(collection(db, "quiz_results"), resultsData);
        } catch (err) {
            console.error("Error saving quiz results:", err);
            setError('Failed to submit quiz. Please try again.');
            setQuizSubmitted(false);
        }
    };

    const renderTimer = () => {
        if (timeLeft === null) return '...';
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="take-quiz-container"><p>Loading quiz...</p></div>;
    if (error) return <div className="take-quiz-container"><p>{error}</p></div>;
    if (!quiz) return <div className="take-quiz-container"><p>Quiz not found.</p></div>;

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
                        <div className="info-item"><span>Questions:</span> <strong>{quiz.questions?.length ?? 0}</strong></div>
                        <div className="info-item"><span>Total Points:</span> <strong>{quiz.totalPoints}</strong></div>
                        <div className="info-item"><span>Time:</span> <strong>{quiz.overallTimeLimit ? `${Math.floor(quiz.overallTimeLimit / 60)} min` : 'N/A'}</strong></div>
                    </div>
                    <button onClick={handleStartQuiz} className="start-quiz-btn">Start Quiz</button>
                </div>
            </div>
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const currentAnswer = selectedAnswers[currentQuestionIndex];
    const questionTextWithBlank = currentQuestion.text?.replace(/___/g, '<span class="fill-in-blank-visual"></span>') || currentQuestion.text || '';
    
    let unmatchedOptions = [];
    if(currentQuestion.type === 'MATCH_THE_FOLLOWING') {
        const matchedValues = Object.values(currentAnswer || {});
        unmatchedOptions = (shuffledQuestionOptions[currentQuestionIndex] || []).filter(opt => !matchedValues.includes(opt));
    }
    
    return (
        <DragDropContext onDragEnd={handleDragEnd}>
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
                        {currentQuestion.type === 'MCQ' && (
                            <div className="options-list">
                                {(currentQuestion.options || []).map((option, index) => (
                                    <div key={index} className={`option-item ${currentAnswer === index ? 'selected' : ''}`} onClick={() => handleAnswerChange(index)}>
                                        <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                                        {option}
                                    </div>
                                ))}
                            </div>
                        )}
                        {currentQuestion.type === 'FILL_IN_THE_BLANK' && (
                            <input type="text" className="fill-in-blank-input" placeholder="Type your answer here..." value={currentAnswer || ''} onChange={(e) => handleAnswerChange(e.target.value)} />
                        )}
                        {currentQuestion.type === 'PARAGRAPH' && (
                            <textarea className="paragraph-input" placeholder="Type your detailed answer here..." rows="6" value={currentAnswer || ''} onChange={(e) => handleAnswerChange(e.target.value)} />
                        )}

                        {currentQuestion.type === 'MATCH_THE_FOLLOWING' && (
                            <div className="match-dnd-container">
                                <div className="match-prompts-column">
                                    {(currentQuestion.prompts || []).map(prompt => (
                                        <Droppable key={prompt} droppableId={`prompt-${prompt}`}>
                                            {(provided, snapshot) => (
                                                <div className="match-prompt-zone" data-is-dragging-over={snapshot.isDraggingOver}>
                                                    <span className="match-prompt-label">{prompt}</span>
                                                    <div ref={provided.innerRef} {...provided.droppableProps} className="match-drop-area">
                                                        {currentAnswer && currentAnswer[prompt] ? (
                                                            <Draggable draggableId={currentAnswer[prompt]} index={0}>
                                                                {(provided) => (
                                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="draggable-option matched">
                                                                        {currentAnswer[prompt]}
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ) : <span className="drop-placeholder">Drop here</span>}
                                                        {provided.placeholder}
                                                    </div>
                                                </div>
                                            )}
                                        </Droppable>
                                    ))}
                                </div>
                                <Droppable droppableId="match-bank">
                                    {(provided, snapshot) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className="match-option-bank" data-is-dragging-over={snapshot.isDraggingOver}>
                                            {unmatchedOptions.map((option, index) => (
                                                <Draggable key={option} draggableId={option} index={index}>
                                                    {(provided) => (
                                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="draggable-option">{option}</div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        )}

                        {currentQuestion.type === 'REORDER' && (
                            <Droppable droppableId="reorder-list">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="reorder-list">
                                        {(currentAnswer || []).map((item, index) => (
                                            <Draggable key={item} draggableId={item} index={index}>
                                                {(provided) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="reorder-item">{item}</div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        )}

                        {currentQuestion.type === 'CATEGORIZE' && (
                            <div className="categorize-board">
                                <div className="category-columns">
                                    {(currentQuestion.categories || []).map(category => (
                                        <Droppable key={category} droppableId={category}>
                                            {(provided, snapshot) => (
                                                <div {...provided.droppableProps} ref={provided.innerRef} className="category-column" data-is-dragging-over={snapshot.isDraggingOver}>
                                                    <h3 className="category-title">{category}</h3>
                                                    <div className="category-items-container">
                                                        {currentAnswer && currentAnswer[category]?.map((itemText, index) => (
                                                            <Draggable key={itemText} draggableId={itemText} index={index}>
                                                                {(provided) => (
                                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="categorize-item">{itemText}</div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                </div>
                                            )}
                                        </Droppable>
                                    ))}
                                </div>
                                <h3 className='item-bank-title'>Items to sort</h3>
                                <Droppable droppableId="bank" direction="horizontal">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="item-bank">
                                            {currentAnswer && currentAnswer.bank?.map((itemText, index) => (
                                                <Draggable key={itemText} draggableId={itemText} index={index}>
                                                    {(provided) => (
                                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="categorize-item unassigned">{itemText}</div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        )}

                        {currentQuestion.type === 'READING_COMPREHENSION' && (
                             <div className="comprehension-view">
                                <div className="passage-box"><p>{currentQuestion.passage}</p></div>
                                <div className="sub-questions-list">
                                    <h4>Questions</h4>
                                    {(currentQuestion.subQuestions || []).map((subQ, subIndex) => (
                                        <div key={subIndex} className="sub-question-item">
                                            <p className="sub-question-text">{subIndex + 1}. {subQ.text}</p>
                                            <div className="sub-question-options">
                                                {(subQ.options || []).map((opt, optIndex) => (
                                                     <div key={optIndex} className={`option-item-sub ${currentAnswer && currentAnswer[subIndex] === optIndex ? 'selected' : ''}`} onClick={() => handleAnswerChange(optIndex, subIndex)}>
                                                        <span className="option-letter-sub">{String.fromCharCode(65 + optIndex)}</span>
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="quiz-navigation">
                    <button onClick={handlePreviousQuestion} className="nav-button prev-button" disabled={currentQuestionIndex === 0}>Previous</button>
                    <button onClick={handleNextQuestion} className="nav-button next-button">{currentQuestionIndex < quiz.questions.length - 1 ? 'Next' : 'Submit Quiz'}</button>
                </div>
                <div className="question-dots">{quiz.questions.map((_, index) => (<div key={index} className={`question-dot ${index === currentQuestionIndex ? 'active' : ''} ${selectedAnswers[index] ? 'answered' : ''}`} onClick={() => setCurrentQuestionIndex(index)}></div>))}</div>
            </div>
        </DragDropContext>
    );
};

export default TakeQuiz;