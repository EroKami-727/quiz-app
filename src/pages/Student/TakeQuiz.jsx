// src/pages/Student/TakeQuiz.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import '../../styles/Student/TakeQuiz.css';


const TakeQuiz = () => {
  const { quizCode } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  // Quiz states
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);

  // Fetch quiz data based on code
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        // Query Firestore for the quiz with matching code
        const quizzesRef = collection(db, "quizzes");
        const quizDoc = await getDoc(doc(quizzesRef, quizCode));
        
        if (quizDoc.exists()) {
          const quizData = quizDoc.data();
          setQuiz(quizData);
          // Initialize selected answers array with nulls for each question
          setSelectedAnswers(new Array(quizData.questions.length).fill(null));
          setTimeLeft(quizData.timeLimit);
        } else {
          setError('Quiz not found. Please check the code and try again.');
        }
      } catch (error) {
        console.error("Error fetching quiz:", error);
        setError('Failed to load quiz. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (quizCode) {
      fetchQuiz();
    }
  }, [quizCode]);

  // Timer effect
  useEffect(() => {
    let timer;
    if (quizStarted && timeLeft > 0 && !quizSubmitted) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && !quizSubmitted) {
      handleSubmitQuiz();
    }

    return () => clearTimeout(timer);
  }, [timeLeft, quizStarted, quizSubmitted]);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        navigate('/student/login');
      })
      .catch((error) => {
        console.error('Sign out error:', error);
      });
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  const handleAnswerSelect = (optionIndex) => {
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newSelectedAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    // Calculate score
    let correctAnswers = 0;
    quiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctOption) {
        correctAnswers++;
      }
    });
    
    const finalScore = Math.round((correctAnswers / quiz.questions.length) * 100);
    setScore(finalScore);
    
    try {
      // Save result to Firestore
      await addDoc(collection(db, "quiz_results"), {
        quizId: quizCode,
        userId: user.uid,
        userEmail: user.email,
        score: finalScore,
        answers: selectedAnswers,
        completedAt: serverTimestamp(),
        timeSpent: quiz.timeLimit - timeLeft
      });
      
      setQuizSubmitted(true);
    } catch (error) {
      console.error("Error saving quiz results:", error);
      setError('Failed to submit quiz. Please try again.');
    }
  };

  const handleReturnToHome = () => {
    navigate('/student/attend-quiz');
  };

  // Loading state
  if (loading) {
    return (
      <div className="quiz-loading-container">
        <div className="loading-spinner"></div>
        <p>Loading quiz...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="quiz-error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={handleReturnToHome} className="return-button">
          Return to Home
        </button>
      </div>
    );
  }

  // Quiz not found
  if (!quiz) {
    return (
      <div className="quiz-error-container">
        <h2>Quiz Not Found</h2>
        <p>The quiz you're looking for doesn't exist.</p>
        <button onClick={handleReturnToHome} className="return-button">
          Return to Home
        </button>
      </div>
    );
  }

  // Quiz completed state
  if (quizSubmitted) {
    return (
      <div className="take-quiz-container">
        <div className="quiz-completed-container">
          <h1>Quiz Completed!</h1>
          <div className="score-display">
            <h2>Your Score</h2>
            <div className="score-circle">
              <span>{score}%</span>
            </div>
            <p>{score >= 70 ? 'Great job!' : 'Keep practicing!'}</p>
          </div>
          
          <div className="quiz-summary">
            <h3>Summary</h3>
            <p>Quiz: {quiz.title}</p>
            <p>Questions: {quiz.questions.length}</p>
            <p>Correct Answers: {Math.round((score / 100) * quiz.questions.length)}</p>
          </div>
          
          <button onClick={handleReturnToHome} className="return-button">
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Quiz intro/start screen
  if (!quizStarted) {
    return (
      <div className="take-quiz-container">
        <button onClick={handleSignOut} className="sign-out-top-btn">
          Sign Out
        </button>
        
        <div className="quiz-intro-container">
          <h1>{quiz.title}</h1>
          
          {quiz.description && (
            <div className="quiz-description">
              <p>{quiz.description}</p>
            </div>
          )}
          
          <div className="quiz-info">
            <div className="info-item">
              <span className="info-label">Questions:</span>
              <span className="info-value">{quiz.questions.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Time Limit:</span>
              <span className="info-value">{Math.floor(quiz.timeLimit / 60)}:{(quiz.timeLimit % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
          
          <div className="quiz-instructions">
            <h3>Instructions</h3>
            <ul>
              <li>Answer all questions to the best of your ability.</li>
              <li>You can navigate between questions using the Next and Previous buttons.</li>
              <li>The quiz will automatically submit when time runs out.</li>
              <li>Click Submit when you've completed all questions.</li>
            </ul>
          </div>
          
          <button onClick={handleStartQuiz} className="start-quiz-btn">
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  // Active quiz taking state
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const minutesLeft = Math.floor(timeLeft / 60);
  const secondsLeft = timeLeft % 60;

  return (
    <div className="take-quiz-container">
      <div className="quiz-header">
        <h1>{quiz.title}</h1>
        <div className="quiz-timer">
          Time Left: {minutesLeft}:{secondsLeft.toString().padStart(2, '0')}
        </div>
      </div>
      
      <div className="quiz-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          ></div>
        </div>
        <div className="progress-text">
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </div>
      </div>
      
      <div className="question-container">
        <h2 className="question-text">{currentQuestion.text}</h2>
        
        <div className="options-list">
          {currentQuestion.options.map((option, index) => (
            <div 
              key={index} 
              className={`option-item ${selectedAnswers[currentQuestionIndex] === index ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(index)}
            >
              <div className="option-checkbox">
                {selectedAnswers[currentQuestionIndex] === index && <span className="checkmark">✓</span>}
              </div>
              <div className="option-text">{option}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="quiz-navigation">
        <button 
          onClick={handlePreviousQuestion} 
          className="nav-button prev-button"
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </button>
        
        {currentQuestionIndex < quiz.questions.length - 1 ? (
          <button 
            onClick={handleNextQuestion} 
            className="nav-button next-button"
          >
            Next
          </button>
        ) : (
          <button 
            onClick={handleSubmitQuiz} 
            className="nav-button submit-button"
          >
            Submit Quiz
          </button>
        )}
      </div>
      
      <div className="question-dots">
        {quiz.questions.map((_, index) => (
          <div 
            key={index}
            className={`question-dot ${index === currentQuestionIndex ? 'active' : ''} ${selectedAnswers[index] !== null ? 'answered' : ''}`}
            onClick={() => setCurrentQuestionIndex(index)}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default TakeQuiz;