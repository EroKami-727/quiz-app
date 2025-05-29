import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../App.css';

const TeacherHome = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const { currentUser, displayName, userRole } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/teacher/login');
      } else {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [auth, navigate]);
  
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
  
  // Navigation handlers
  const handleCreateQuiz = () => {
    navigate('/teacher/create-quiz');
  };
  
  const handleYourQuizzes = () => {
    navigate('/teacher/your-quizzes');
  };
  
  const handleProfile = () => {
    navigate('/teacher/profile');
  };
  
  const handleAnalytics = () => {
    navigate('/teacher/analytics');
  };
  
  const handleStudentResults = () => {
    navigate('/teacher/student-results');
  };
  
  const handleQuizHistory = () => {
    navigate('/teacher/quiz-history');
  };
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  return (
    <div className="teacher-home-container">
      {/* Header */}
      <div className="teacher-home-header">
        <div className="header-left">
          <h1>Teacher Dashboard</h1>
          <p>Welcome back, {displayName || 'Teacher'}!</p>
        </div>
        <div className="header-right">
          <button onClick={handleProfile} className="profile-btn">
            <i className="fas fa-user"></i> Profile
          </button>
          <button onClick={handleSignOut} className="sign-out-btn">
            Sign Out
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        <div className="dashboard-grid">
          {/* Primary Actions */}
          <div className="dashboard-section primary-actions">
            <h2>Quick Actions</h2>
            <div className="action-cards">
              <div className="action-card primary" onClick={handleCreateQuiz}>
                <div className="card-icon">
                  <i className="fas fa-plus-circle"></i>
                </div>
                <h3>Create Quiz</h3>
                <p>Design new quizzes for your students</p>
              </div>
              
              <div className="action-card secondary" onClick={handleYourQuizzes}>
                <div className="card-icon">
                  <i className="fas fa-list-alt"></i>
                </div>
                <h3>Your Quizzes</h3>
                <p>Manage and edit your existing quizzes</p>
              </div>
            </div>
          </div>
          
          {/* Management Tools */}
          <div className="dashboard-section management-tools">
            <h2>Management</h2>
            <div className="action-cards">
              <div className="action-card" onClick={handleStudentResults}>
                <div className="card-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <h3>Student Results</h3>
                <p>View detailed student performance</p>
              </div>
              
              <div className="action-card" onClick={handleAnalytics}>
                <div className="card-icon">
                  <i className="fas fa-analytics"></i>
                </div>
                <h3>Analytics</h3>
                <p>Track quiz performance and insights</p>
              </div>
              
              <div className="action-card" onClick={handleQuizHistory}>
                <div className="card-icon">
                  <i className="fas fa-history"></i>
                </div>
                <h3>Quiz History</h3>
                <p>Browse past quiz sessions</p>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="dashboard-section stats-section">
            <h2>Quick Stats</h2>
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">Active Quizzes</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">Total Students</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">0</div>
                <div className="stat-label">Completed Sessions</div>
              </div>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="dashboard-section recent-activity">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              <div className="activity-item">
                <i className="fas fa-info-circle"></i>
                <span>No recent activity</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherHome;