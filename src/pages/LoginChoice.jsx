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
      
      <div className="login-info-panel">
        <div className="info-content">
          <h2>Why Quizlike?</h2>
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <div className="feature-text">
                <h3>Interactive Learning</h3>
                <p>Engage students with interactive quizzes and immediate feedback</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <div className="feature-text">
                <h3>Track Progress</h3>
                <p>Monitor student performance with detailed analytics</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <div className="feature-text">
                <h3>Easy to Use</h3>
                <p>Intuitive interface for both teachers and students</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✓</div>
              <div className="feature-text">
                <h3>Mobile Friendly</h3>
                <p>Access quizzes anytime, anywhere, on any device</p>
              </div>
            </div>
          </div>
          <div className="testimonial">
            <p>"Quizlike has transformed how I assess my students. It's a game-changer for modern education!"</p>
            <div className="testimonial-author">- Professor Johnson, Computer Science</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginChoice;