import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function LoginChoice() {
  const navigate = useNavigate();

  const handleStudentClick = () => {
    navigate('/student/login');
  };

  const handleTeacherClick = () => {
    navigate('/teacher/login');
  };

  return (
    <div className="login-choice-container">
      <div className="login-choice-content">
        <h1 className="login-choice-title">Welcome to Quizlike</h1>
        <p className="login-choice-subtitle">Please select how you want to continue</p>
        
        <div className="login-options">
          <div 
            className="login-option"
            onClick={handleStudentClick}
          >
            <div className="login-option-image" style={{backgroundColor: '#4b7bec', borderRadius: '50%'}}>
              <div className="login-option-icon">👩‍🎓</div>
            </div>
            <h2 className="login-option-title">Student</h2>
            <p className="login-option-description">Take quizzes and track your progress</p>
          </div>
          
          <div 
            className="login-option"
            onClick={handleTeacherClick}
          >
            <div className="login-option-image" style={{backgroundColor: '#2d8cff', borderRadius: '50%'}}>
              <div className="login-option-icon">👨‍🏫</div>
            </div>
            <h2 className="login-option-title">Teacher</h2>
            <p className="login-option-description">Create and manage quizzes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginChoice;