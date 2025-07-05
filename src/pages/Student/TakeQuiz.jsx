import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import '../../styles/Student/TakeQuiz.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import MediaRenderer from '../../components/MediaRenderer';
import { FaGripLines, FaArrowLeft, FaArrowRight, FaCheckCircle, FaClipboardList } from 'react-icons/fa';

const shuffleArray = (array) => { if (!array || !Array.isArray(array)) return []; return [...array].sort(() => Math.random() - 0.5); };

const TakeQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;

    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [timeSpent, setTimeSpent] = useState([]);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [finalResults, setFinalResults] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const timerRef = useRef(null);
    const questionStartTimeRef = useRef(null);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        const fetchQuizAndInit = async () => {
            if (!quizId) { setError("No Quiz ID provided."); setLoading(false); return; }
            setLoading(true);
            try {
                const quizDocRef = doc(db, "quizzes", quizId);
                const quizDocSnap = await getDoc(quizDocRef);
                if (quizDocSnap.exists()) {
                    const quizData = quizDocSnap.data(); setQuiz(quizData);
                    const initialAnswers = (quizData.questions || []).map(q => {
                        try {
                            switch(q.type) {
                                case 'MCQ': return [];
                                case 'FILL_IN_THE_BLANK': return '';
                                case 'PARAGRAPH': return '';
                                case 'MATCH_THE_FOLLOWING': const answerBank = (q.matchData?.pairs || []).map(p => ({ id: p.id, answerText: p.answer, answerMedia: p.answerMedia })); return { pairs: {}, bank: shuffleArray(answerBank) };
                                case 'REORDER': return shuffleArray(q.reorderData?.items || []);
                                case 'CATEGORIZE': return { ...Object.fromEntries((q.categorizeData?.categories || []).map(cat => [cat.id, []])), bank: shuffleArray(q.categorizeData?.items || []) };
                                case 'VISUAL_COMPREHENSION': case 'LISTENING_COMPREHENSION': const subQs = q.visualData?.subQuestions || q.listeningData?.subQuestions || []; const subAnswers = {}; subQs.forEach((subQ, index) => { subAnswers[index] = subQ.type === 'MCQ' ? [] : ''; }); return subAnswers;
                                default: return null;
                            }
                        } catch (e) { console.error(`Error initializing for type ${q.type}:`, e); return null; }
                    });
                    setAnswers(initialAnswers); setTimeSpent(new Array((quizData.questions || []).length).fill(0));
                } else { setError('Quiz not found.'); }
            } catch (err) { console.error("Error fetching quiz:", err); setError('Failed to load quiz.'); } 
            finally { setLoading(false); }
        };
        fetchQuizAndInit();
    }, [quizId]);

    useEffect(() => {
        if (!quizStarted || quizSubmitted || !quiz || currentQuestionIndex >= quiz.questions.length) return;
        const currentQuestion = quiz.questions[currentQuestionIndex];
        const timeLimit = parseInt(currentQuestion.timeLimit, 10) || 60;
        questionStartTimeRef.current = Date.now();
        if(timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(timeLimit);
        timerRef.current = setInterval(() => { setTimeLeft(prevTime => { if (prevTime <= 1) { clearInterval(timerRef.current); handleNextQuestion(true); return 0; } return prevTime - 1; }); }, 1000);
        return () => clearInterval(timerRef.current);
    }, [currentQuestionIndex, quizStarted, quizSubmitted, quiz]);

    const recordTimeSpent = () => { const endTime = Date.now(); const startTime = questionStartTimeRef.current; const spent = startTime ? (endTime - startTime) / 1000 : 0; const newTimeSpent = [...timeSpent]; newTimeSpent[currentQuestionIndex] = spent; setTimeSpent(newTimeSpent); };
    
    const handleAnswerChange = (value, subIndex = null) => {
        const newAnswers = JSON.parse(JSON.stringify(answers));
        const question = quiz.questions[currentQuestionIndex];
        const currentAnswerSet = newAnswers[currentQuestionIndex];
        if (question.type.includes('COMPREHENSION')) {
            const dataKey = question.visualData ? 'visualData' : 'listeningData';
            if(question[dataKey].subQuestions[subIndex].type === 'MCQ') {
                const currentSelection = currentAnswerSet[subIndex] || [];
                const newSelection = currentSelection.includes(value) ? currentSelection.filter(id => id !== value) : [...currentSelection, value];
                currentAnswerSet[subIndex] = newSelection;
            } else {
                currentAnswerSet[subIndex] = value;
            }
        } else if (question.type === 'MCQ') {
            const currentSelection = currentAnswerSet || [];
            const newSelection = currentSelection.includes(value) ? currentSelection.filter(id => id !== value) : [...currentSelection, value];
            newAnswers[currentQuestionIndex] = newSelection;
        } else {
            newAnswers[currentQuestionIndex] = value;
        }
        setAnswers(newAnswers);
    };

    const handleDragEnd = (result) => {
        const { source, destination } = result; if (!destination) return;
        const q = quiz.questions[currentQuestionIndex];
        setAnswers(currentAnswers => {
            const newAnswers = JSON.parse(JSON.stringify(currentAnswers));
            let answerForQuestion = newAnswers[currentQuestionIndex];
            if (q.type === 'REORDER') { const reorderedItems = Array.from(answerForQuestion); const [removed] = reorderedItems.splice(source.index, 1); reorderedItems.splice(destination.index, 0, removed); newAnswers[currentQuestionIndex] = reorderedItems; }
            if (q.type === 'CATEGORIZE') {
                const sourceColId = source.droppableId; const destColId = destination.droppableId;
                const sourceCol = Array.from(answerForQuestion[sourceColId]);
                const [movedItem] = sourceCol.splice(source.index, 1);
                if (sourceColId === destColId) { sourceCol.splice(destination.index, 0, movedItem); answerForQuestion[sourceColId] = sourceCol;
                } else { const destCol = Array.from(answerForQuestion[destColId] || []); destCol.splice(destination.index, 0, movedItem); answerForQuestion[sourceColId] = sourceCol; answerForQuestion[destColId] = destCol; }
                newAnswers[currentQuestionIndex] = answerForQuestion;
            }
            if (q.type === 'MATCH_THE_FOLLOWING') {
                const sourceColId = source.droppableId; const destColId = destination.droppableId;
                let draggedItem;
                if (sourceColId === 'bank') {
                    draggedItem = answerForQuestion.bank[source.index];
                    answerForQuestion.bank.splice(source.index, 1);
                } else {
                    draggedItem = answerForQuestion.pairs[sourceColId];
                    delete answerForQuestion.pairs[sourceColId];
                }
                if (destColId === 'bank') {
                    answerForQuestion.bank.splice(destination.index, 0, draggedItem);
                } else {
                    const displacedItem = answerForQuestion.pairs[destColId];
                    if (displacedItem) {
                        answerForQuestion.bank.push(displacedItem);
                    }
                    answerForQuestion.pairs[destColId] = draggedItem;
                }
                newAnswers[currentQuestionIndex] = answerForQuestion;
            }
            return newAnswers;
        });
    };
    
    const handleNextQuestion = (isTimeOut = false) => { if (!isTimeOut) recordTimeSpent(); setDirection(1); if (currentQuestionIndex < quiz.questions.length - 1) { setCurrentQuestionIndex(currentQuestionIndex + 1); } else { handleSubmitQuiz(); } };
    const handlePreviousQuestion = () => { setDirection(-1); if (currentQuestionIndex > 0) { setCurrentQuestionIndex(currentQuestionIndex - 1); } };
    
    const handleSubmitQuiz = async () => {
        if (quizSubmitted || !user) return;
        recordTimeSpent();
        setQuizSubmitted(true); clearInterval(timerRef.current);
        setError('');
        try {
            let totalScore = 0; let speedBonus = 0; let requiresManualGrading = false;
            const detailedAnswers = quiz.questions.map((q, index) => {
                const userAnswer = answers[index];
                let sanitizedUserAnswer = JSON.parse(JSON.stringify(userAnswer));
                let pointsAwarded = 0; let status = 'auto_graded'; let isCorrect = false;
                switch (q.type) {
                    case 'MCQ': const correctIds = q.mcqData.correctOptions.map(String); const selectedIds = (userAnswer || []).map(String); if(correctIds.length > 0 && correctIds.length === selectedIds.length && correctIds.every(id => selectedIds.includes(id))) { pointsAwarded = q.points; isCorrect = true; } break;
                    case 'FILL_IN_THE_BLANK': const normUserAns = (userAnswer || '').trim().toLowerCase(); const correctAnswers = q.fillBlankData.answers.map(a => a.text.toLowerCase()); if (correctAnswers.includes(normUserAns)) { pointsAwarded = q.points; isCorrect = true; } break;
                    case 'PARAGRAPH': requiresManualGrading = true; status = 'pending_review'; break;
                    case 'MATCH_THE_FOLLOWING': let correctMatches = 0; if (q.matchData && q.matchData.pairs) { q.matchData.pairs.forEach(pair => { const droppedAnswer = userAnswer?.pairs?.[pair.id]; if (droppedAnswer && droppedAnswer.answerText === pair.answer) { correctMatches++; } }); pointsAwarded = (q.matchData.pairs.length > 0) ? Math.round((correctMatches / q.matchData.pairs.length) * q.points) : 0; if (q.matchData.pairs.length > 0 && correctMatches === q.matchData.pairs.length) isCorrect = true; } break;
                    case 'CATEGORIZE': let correctCategorizations = 0; if (q.categorizeData && q.categorizeData.items) { q.categorizeData.items.forEach(item => { const studentCategory = Object.keys(userAnswer || {}).find(catId => catId !== 'bank' && userAnswer[catId].some(i => i.id === item.id)); if (String(studentCategory) === String(item.categoryId)) { correctCategorizations++; } }); pointsAwarded = (q.categorizeData.items.length > 0) ? Math.round((correctCategorizations / q.categorizeData.items.length) * q.points) : 0; if (q.categorizeData.items.length > 0 && correctCategorizations === q.categorizeData.items.length) isCorrect = true; } break;
                    case 'REORDER': const isCorrectOrder = userAnswer && q.reorderData?.items ? userAnswer.every((item, i) => item.id === q.reorderData.items[i].id) : false; if (isCorrectOrder) { pointsAwarded = q.points; isCorrect = true; } break;
                    case 'VISUAL_COMPREHENSION': case 'LISTENING_COMPREHENSION': const subQs = q.visualData?.subQuestions || q.listeningData?.subQuestions; let subQPoints = 0; if (subQs) { subQs.forEach((subQ, subIndex) => { if(subQ.type === 'MCQ') { const correctSubQIds = subQ.mcqData.correctOptions.map(String); const selectedSubQIds = (userAnswer[subIndex] || []).map(String); if (correctSubQIds.length > 0 && correctSubQIds.length === selectedSubQIds.length && correctSubQIds.every(id => selectedSubQIds.includes(id))) { subQPoints += (subQ.points || 5); } } }); pointsAwarded = subQPoints; if (subQPoints === q.points) isCorrect = true; } break;
                }
                totalScore += pointsAwarded;
                if (isCorrect) { const timeTaken = timeSpent[index] || q.timeLimit; const timeLimit = parseInt(q.timeLimit, 10); if (timeTaken < timeLimit) { const timeRatio = 1 - (timeTaken / timeLimit); const bonusPoints = Math.ceil((q.points * 0.2) * timeRatio); speedBonus += bonusPoints; } }
                return { type: q.type, questionText: q.questionText, userAnswer: sanitizedUserAnswer, pointsAwarded, status, isCorrect };
            });
            const finalScoreWithBonus = totalScore + speedBonus;
            const resultDoc = { quizId, userId: user.uid, quizTitle: quiz.title, status: requiresManualGrading ? 'pending' : 'completed', score: totalScore, bonus: speedBonus, finalScore: finalScoreWithBonus, maxScore: quiz.totalPoints, completedAt: serverTimestamp(), answers: detailedAnswers, teacherId: quiz.createdBy };
            const docRef = await addDoc(collection(db, "quiz_results"), resultDoc);
            setFinalResults({ id: docRef.id, ...resultDoc });
        } catch (err) { console.error("CRITICAL ERROR saving results:", err); setError("A critical error occurred while submitting your quiz. Please contact your teacher."); setQuizSubmitted(false); }
    };
    
    if (loading) return <div className="take-quiz-container"><div className="loading-spinner"></div><p>Loading quiz...</p></div>;
    if (error && !quizSubmitted) return <div className="take-quiz-container"><p className="quiz-error-message">{error}</p></div>;
    if (!quizStarted) { return (<div className="take-quiz-container"><div className="quiz-intro-container"><h1>{quiz.title}</h1><p className="quiz-description">{quiz.description}</p><div className="quiz-info"><div className="info-item"><span>Questions:</span> <strong>{quiz.questions?.length ?? 0}</strong></div><div className="info-item"><span>Total Points:</span> <strong>{quiz.totalPoints}</strong></div></div><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setQuizStarted(true)} className="start-quiz-btn">Start Quiz</motion.button></div></div>); }
    
    if (quizSubmitted) {
        return (
            <div className="take-quiz-container">
                {finalResults ? (
                    <div className="quiz-completed-container">
                        <h1><FaCheckCircle/> Quiz Completed!</h1>
                        <div className="score-display">
                            <h2>Your Results</h2>
                            <div className="score-breakdown">
                                <div>Base Score: <span>{finalResults.score} / {finalResults.maxScore}</span></div>
                                <div>Speed Bonus: <span className="bonus-points">+{finalResults.bonus}</span></div>
                            </div>
                            <div className="score-circle final-score">
                                <span className="score-label">Final Score</span>
                                <span className="score-value">{finalResults.finalScore}</span>
                            </div>
                            {finalResults.status === 'pending' && <p className="pending-review-text">Some questions require manual grading by your teacher.</p>}
                        </div>
                        <div className="completion-actions">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/student/dashboard')} className="return-button">Back to Dashboard</motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(`/student/results/`)} className="review-button"><FaClipboardList /> View Review</motion.button>
                        </div>
                    </div>
                ) : (
                    <div className="quiz-completed-container">
                        <div className="loading-spinner"></div>
                        <h2>Submitting your answers...</h2>
                    </div>
                )}
            </div>
        );
    }
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestionIndex];
    const mainMediaToShow = currentQuestion.visualData?.mainMedia || currentQuestion.listeningData?.mainMedia || currentQuestion.media;
    const variants = { enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }), };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="take-quiz-container">
                <div className="quiz-header"><h1>{quiz.title}</h1><div className="quiz-timer">{timeLeft}s</div></div>
                <div className="quiz-progress"><div className="progress-bar"><div className="progress-fill" style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}></div></div><div className="progress-text">Question {currentQuestionIndex + 1} of {quiz.questions.length}</div></div>
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div className="question-container" key={currentQuestion.id} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'tween', ease: 'circOut', duration: 0.5 }}>
                        <MediaRenderer media={mainMediaToShow} transform="question_main"/>
                        <h2 className="question-text">{currentQuestion.questionText}</h2>
                        <div className="answer-area">
                            {currentQuestion.type === 'MCQ' && (<div className="options-list mcq">{currentQuestion.mcqData.options.map((option) => (<motion.div key={option.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className={`option-item ${currentAnswer?.includes(option.id) ? 'selected' : ''}`} onClick={() => handleAnswerChange(option.id)}><div className="option-checkbox">{currentAnswer?.includes(option.id) && '✔'}</div>{option.text && <span className="option-text">{option.text}</span>}<MediaRenderer media={option.media} transform="thumbnail" /> </motion.div>))}</div>)}
                            {currentQuestion.type === 'FILL_IN_THE_BLANK' && (<input type="text" className="fill-in-blank-input" value={currentAnswer || ''} onChange={(e) => handleAnswerChange(e.target.value)} />)}
                            {currentQuestion.type === 'PARAGRAPH' && (<textarea className="paragraph-input" value={currentAnswer || ''} onChange={(e) => handleAnswerChange(e.target.value)} />)}
                            {currentQuestion.type === 'MATCH_THE_FOLLOWING' && currentAnswer && (<div className="match-dnd-container"><div className="match-prompts-column">{currentQuestion.matchData.pairs.map(pair => (<div key={pair.id} className="match-prompt-item"><div className="match-prompt-content"><MediaRenderer media={pair.promptMedia} transform="thumbnail"/><span className="match-prompt-label">{pair.prompt}</span></div><Droppable droppableId={String(pair.id)}>{(provided) => (<div ref={provided.innerRef} {...provided.droppableProps} className={`match-drop-area ${currentAnswer.pairs[pair.id] ? 'filled' : ''}`}>{currentAnswer.pairs[pair.id] ? <Draggable draggableId={String(currentAnswer.pairs[pair.id].id)} index={0}>{(p) => (<div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="draggable-option matched"><MediaRenderer media={currentAnswer.pairs[pair.id].answerMedia} transform="thumbnail"/><span>{currentAnswer.pairs[pair.id].answerText}</span></div>)}</Draggable> : <span className="drop-placeholder">Drop here</span>}{provided.placeholder}</div>)}</Droppable></div>))}</div><div className="match-option-bank-wrapper"><h4>Answers</h4><Droppable droppableId="bank">{(provided) => (<div ref={provided.innerRef} {...provided.droppableProps} className="match-option-bank">{currentAnswer.bank.map((answer, index) => (<Draggable key={answer.id} draggableId={String(answer.id)} index={index}>{(p) => (<div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="draggable-option"><MediaRenderer media={answer.answerMedia} transform="thumbnail"/><span>{answer.answerText}</span></div>)}</Draggable>))}{provided.placeholder}</div>)}</Droppable></div></div>)}
                            {currentQuestion.type === 'REORDER' && currentAnswer && (<Droppable droppableId="reorder-list">{(provided) => (<motion.div {...provided.droppableProps} ref={provided.innerRef} className="reorder-list">{currentAnswer.map((item, index) => (<Draggable key={item.id} draggableId={String(item.id)} index={index}>{(p) => (<motion.div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} layout className="reorder-item"><FaGripLines/><MediaRenderer media={item.media} transform="thumbnail" className="reorder-item-media"/><span>{item.text}</span></motion.div>)}</Draggable>))}{provided.placeholder}</motion.div>)}</Droppable>)}
                            {currentQuestion.type === 'CATEGORIZE' && currentAnswer && (<div className="categorize-board"><div className="category-columns">{currentQuestion.categorizeData.categories.map(cat => (<Droppable key={cat.id} droppableId={String(cat.id)}>{(provided) => (<div {...provided.droppableProps} ref={provided.innerRef} className="category-column"><h3 className="category-title">{cat.name}</h3><div className="category-items-container">{currentAnswer[cat.id]?.map((item, index) => (<Draggable key={item.id} draggableId={String(item.id)} index={index}>{(p) => (<div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="categorize-item"><MediaRenderer media={item.media} transform="thumbnail"/><span>{item.text}</span></div>)}</Draggable>))}{provided.placeholder}</div></div>)}</Droppable>))}</div><div className="item-bank-wrapper"><h4>Items to Sort</h4><Droppable droppableId="bank" direction="horizontal">{(provided) => (<div {...provided.droppableProps} ref={provided.innerRef} className="item-bank">{currentAnswer.bank?.map((item, index) => (<Draggable key={item.id} draggableId={String(item.id)} index={index}>{(p) => (<div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="categorize-item unassigned"><MediaRenderer media={item.media} transform="thumbnail"/><span>{item.text}</span></div>)}</Draggable>))}{provided.placeholder}</div>)}</Droppable></div></div>)}
                            {(currentQuestion.type === 'VISUAL_COMPREHENSION' || currentQuestion.type === 'LISTENING_COMPREHENSION') && (<div className="comprehension-view"><div className="sub-questions-list">{(currentQuestion.visualData?.subQuestions || currentQuestion.listeningData?.subQuestions).map((subQ, subIndex) => (<div key={subQ.id} className="sub-question-item"><p className="sub-question-text">{subIndex + 1}. {subQ.questionText}</p>{subQ.type === 'MCQ' && (<div className="options-list sub-mcq">{subQ.mcqData.options.map((option) => (<div key={option.id} className={`option-item ${currentAnswer[subIndex]?.includes(option.id) ? 'selected' : ''}`} onClick={() => handleAnswerChange(option.id, subIndex)}><div className="option-checkbox">{currentAnswer[subIndex]?.includes(option.id) && '✔'}</div><span className="option-text">{option.text}</span></div>))}</div>)}</div>))}</div></div>)}
                        </div>
                    </motion.div>
                </AnimatePresence>
                <div className="quiz-navigation"><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handlePreviousQuestion} className="nav-button prev-button" disabled={currentQuestionIndex === 0}><FaArrowLeft /> Previous</motion.button><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleNextQuestion(false)} className="nav-button next-button">{currentQuestionIndex < quiz.questions.length - 1 ? 'Next' : 'Submit Quiz'} <FaArrowRight /></motion.button></div>
            </div>
        </DragDropContext>
    );
};

export default TakeQuiz;