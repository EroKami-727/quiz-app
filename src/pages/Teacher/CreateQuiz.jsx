import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../App.css';
// Note: Additional CSS for this component is added to App.css

const CreateQuiz = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  
  // Authentication state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Quiz state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [questions, setQuestions] = useState([
    { 
      text: '', 
      options: ['', '', '', ''], 
      correctOption: 0 
    }
  ]);
  const [timeLimit, setTimeLimit] = useState(60); // In seconds
  const [isPublished, setIsPublished] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  
  // Check if user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [auth]);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/teacher/login');
    }
  }, [loading, user, navigate]);
  
  // Generate a random alphanumeric code
  const generateQuizCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  // Handle sign out
  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        navigate('/teacher/login');
      })
      .catch((error) => {
        setError('Failed to sign out: ' + error.message);
      });
  };
  
  // Handle adding a new question
  const handleAddQuestion = () => {
    setQuestions([
      ...questions, 
      { 
        text: '', 
        options: ['', '', '', ''], 
        correctOption: 0 
      }
    ]);
  };
  
  // Handle removing a question
  const handleRemoveQuestion = (index) => {
    if (questions.length > 1) {
      const newQuestions = [...questions];
      newQuestions.splice(index, 1);
      setQuestions(newQuestions);
    } else {
      setError('Quiz must have at least one question');
    }
  };
  
  // Handle question text change
  const handleQuestionChange = (index, text) => {
    const newQuestions = [...questions];
    newQuestions[index].text = text;
    setQuestions(newQuestions);
  };
  
  // Handle option text change
  const handleOptionChange = (questionIndex, optionIndex, text) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = text;
    setQuestions(newQuestions);
  };
  
  // Handle correct option change
  const handleCorrectOptionChange = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].correctOption = optionIndex;
    setQuestions(newQuestions);
  };
  
  // Validate the quiz
  const validateQuiz = () => {
    if (!quizTitle.trim()) {
      setError('Quiz title is required');
      return false;
    }
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.text.trim()) {
        setError(`Question ${i + 1} text is required`);
        return false;
      }
      
      for (let j = 0; j < question.options.length; j++) {
        if (!question.options[j].trim()) {
          setError(`Option ${j + 1} for question ${i + 1} is required`);
          return false;
        }
      }
    }
    
    setError('');
    return true;
  };
  
  // Handle publishing the quiz
  const handlePublishQuiz = async () => {
    if (!validateQuiz()) return;
    
    try {
      const quizCode = generateQuizCode();
      
      // Save to Firestore
      await addDoc(collection(db, "quizzes"), {
        title: quizTitle,
        description: quizDescription,
        questions: questions,
        timeLimit: timeLimit,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        code: quizCode
      });
      
      setGeneratedCode(quizCode);
      setIsPublished(true);
      setSuccessMessage('Quiz published successfully!');
      
      // Clear the form or reset states if needed
      // resetForm();
    } catch (error) {
      setError('Error publishing quiz: ' + error.message);
    }
  };
  
  // Handle creating a new quiz after publishing
  const handleCreateNewQuiz = () => {
    setQuizTitle('');
    setQuizDescription('');
    setQuestions([{ text: '', options: ['', '', '', ''], correctOption: 0 }]);
    setTimeLimit(60);
    setIsPublished(false);
    setGeneratedCode('');
    setSuccessMessage('');
    setError('');
  };
  
  // Show loading if auth state is being checked
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  return (
    <div className="create-quiz-container">
      <button onClick={handleSignOut} className="sign-out-top-btn">
        Sign Out
      </button>
      
      <div className="create-quiz-content">
        <h1 className="page-title">Create Quiz</h1>
        
        {!isPublished ? (
          <>
            <div className="quiz-form-section">
              <div className="quiz-basic-info">
                <h2>Quiz Details</h2>
                <div className="form-group">
                  <label htmlFor="quiz-title">Quiz Title</label>
                  <input
                    id="quiz-title"
                    type="text"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="Enter quiz title"
                    className="form-control"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="quiz-description">Description (Optional)</label>
                  <textarea
                    id="quiz-description"
                    value={quizDescription}
                    onChange={(e) => setQuizDescription(e.target.value)}
                    placeholder="Enter quiz description"
                    className="form-control"
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="time-limit">Time Limit (seconds)</label>
                  <input
                    id="time-limit"
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Math.max(10, parseInt(e.target.value) || 0))}
                    className="form-control"
                    min="10"
                  />
                </div>
              </div>
            </div>
            
            <div className="quiz-questions-section">
              <h2>Questions</h2>
              
              {questions.map((question, questionIndex) => (
                <div key={questionIndex} className="question-card">
                  <div className="question-header">
                    <h3>Question {questionIndex + 1}</h3>
                    <button 
                      onClick={() => handleRemoveQuestion(questionIndex)}
                      className="remove-question-btn"
                      type="button"
                      disabled={questions.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor={`question-${questionIndex}`}>Question Text</label>
                    <input
                      id={`question-${questionIndex}`}
                      type="text"
                      value={question.text}
                      onChange={(e) => handleQuestionChange(questionIndex, e.target.value)}
                      placeholder="Enter question text"
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="options-container">
                    <h4>Options</h4>
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="option-item">
                        <div className="form-check">
                          <input
                            id={`correct-option-${questionIndex}-${optionIndex}`}
                            className="form-check-input"
                            type="radio"
                            name={`correct-option-${questionIndex}`}
                            checked={question.correctOption === optionIndex}
                            onChange={() => handleCorrectOptionChange(questionIndex, optionIndex)}
                          />
                          <label 
                            htmlFor={`correct-option-${questionIndex}-${optionIndex}`}
                            className="form-check-label"
                          >
                            Correct
                          </label>
                        </div>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                          className="form-control"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <button 
                onClick={handleAddQuestion}
                className="add-question-btn"
                type="button"
              >
                Add Question
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-actions">
              <button 
                onClick={handlePublishQuiz}
                className="publish-quiz-btn"
                type="button"
              >
                Publish Quiz
              </button>
            </div>
          </>
        ) : (
          <div className="quiz-published-section">
            <div className="success-message">
              {successMessage}
            </div>
            
            <div className="quiz-code-container">
              <h2>Your Quiz Code</h2>
              <div className="quiz-code">{generatedCode}</div>
              <p>Share this code with your students to let them access the quiz</p>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedCode);
                  setSuccessMessage('Code copied to clipboard!');
                  setTimeout(() => setSuccessMessage('Quiz published successfully!'), 2000);
                }}
                className="copy-code-btn"
                type="button"
              >
                Copy Code
              </button>
            </div>
            
            <button
              onClick={handleCreateNewQuiz}
              className="new-quiz-btn"
              type="button"
            >
              Create Another Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateQuiz;