import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css'; // Make sure this path is correct

function LoginChoice() {
  const navigate = useNavigate();

  const handleStudentClick = () => {
    navigate('/student/login');
  };

  const handleTeacherClick = () => {
    navigate('/teacher/login');
  };

  return (
    // Main container for background and overall centering/padding
    <div className="login-choice-container">
      {/* NEW: Wrapper to hold the two panels and manage their layout */}
      <div className="login-choice-wrapper">

        {/* Panel 1: Login Choices */}
        <div className="login-choice-content">
          <h1 className="login-choice-title">Welcome to Quizlike</h1>
          <p className="login-choice-subtitle">Please select how you want to continue</p>

          <div className="login-options">
            <div
              className="login-option"
              onClick={handleStudentClick}
              role="button" // Add role for accessibility
              tabIndex={0} // Make it focusable
              onKeyPress={(e) => e.key === 'Enter' && handleStudentClick()} // Allow activation with Enter key
              aria-label="Continue as Student" // Accessibility label
            >
              <div className="login-option-image" style={{backgroundColor: '#4b7bec'}}> {/* Moved border-radius to CSS */}
                {/* Using span for emoji is fine, ensures it's treated as text */}
                <span className="login-option-icon" role="img" aria-label="Student emoji">👩‍🎓</span>
              </div>
              <h2 className="login-option-title">Student</h2>
              <p className="login-option-description">Take quizzes and track your progress</p>
            </div>

            <div
              className="login-option"
              onClick={handleTeacherClick}
              role="button" // Add role for accessibility
              tabIndex={0} // Make it focusable
              onKeyPress={(e) => e.key === 'Enter' && handleTeacherClick()} // Allow activation with Enter key
              aria-label="Continue as Teacher" // Accessibility label
            >
              <div className="login-option-image" style={{backgroundColor: '#2d8cff'}}> {/* Moved border-radius to CSS */}
                 <span className="login-option-icon" role="img" aria-label="Teacher emoji">👨‍🏫</span>
              </div>
              <h2 className="login-option-title">Teacher</h2>
              <p className="login-option-description">Create and manage quizzes</p>
            </div>
          </div>
        </div>

        {/* Panel 2: Why Quizlike Info */}
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
          </div>
        </div>

      </div> {/* End of login-choice-wrapper */}
    </div> // End of login-choice-container
  );
}

export default LoginChoice;