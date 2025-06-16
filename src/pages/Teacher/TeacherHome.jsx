import React, { useState, useEffect, useRef } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/Teacher/TeacherHome.css';

const AnimatedCounter = ({ value, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (start === end) return;

    const totalMiliseconds = duration;
    const incrementTime = (totalMiliseconds / end) || 0;

    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
};

const TeacherHome = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const { currentUser, displayName } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [stats, setStats] = useState({
    activeQuizzes: 0,
    totalQuizzes: 0,
    totalStudents: 0,
    completedSessions: 0
  });
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [isQuizTypeModalOpen, setIsQuizTypeModalOpen] = useState(false);
  
  const dataFetched = useRef(false);

  useEffect(() => {
    if (currentUser && !dataFetched.current) {
      dataFetched.current = true;
      fetchDashboardData();
    } else if (currentUser === null) {
        // If auth context explicitly says no user, stop loading and let ProtectedRoute handle it.
        setLoading(false); 
    }
  }, [currentUser]);

  const fetchDashboardData = async () => {
    setLoading(true); 
    try {
      const quizzesQuery = query(
        collection(db, "quizzes"),
        where("createdBy", "==", currentUser.uid)
      );
      
      const quizzesSnapshot = await getDocs(quizzesQuery);
      const quizzes = quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeCount = quizzes.filter(q => q.active).length;

      const sessionsQuery = query(
        collection(db, "quiz_results"),
        where("teacherId", "==", currentUser.uid) // Assuming quiz_results has teacherId
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const uniqueStudents = new Set(sessionsSnapshot.docs.map(doc => doc.data().userId));

      setStats({
        activeQuizzes: activeCount,
        totalQuizzes: quizzes.length,
        totalStudents: uniqueStudents.size,
        completedSessions: sessionsSnapshot.size
      });

      const activity = quizzes
        .sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        .slice(0, 3)
        .map(quiz => ({
        type: 'quiz_created',
        message: `Created quiz "${quiz.title}"`,
        timestamp: quiz.createdAt,
        icon: 'fas fa-plus-circle'
      }));

      setRecentActivity(activity.length > 0 ? activity : [
        {
          type: 'welcome',
          message: 'Welcome! Create your first quiz to get started.',
          timestamp: new Date(),
          icon: 'fas fa-star'
        }
      ]);

    } catch (error) {
      console.error("Error fetching dashboard data: ", error);
      setError('Error loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignOut = () => signOut(auth).then(() => navigate('/teacher/login')).catch(console.error);
  const handleYourQuizzes = () => navigate('/teacher/your-quizzes');
  const handleCreateQuizClick = () => setIsQuizTypeModalOpen(true);
  const handleSelectQuizType = (type) => {
    setIsQuizTypeModalOpen(false);
    navigate('/teacher/create-quiz', { state: { quizType: type } });
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / 3600000;
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  return (
    <div className="teacher-home-container">
      <div className="teacher-home-header fade-in">
        <div className="header-left">
          <h1>Teacher Dashboard</h1>
          <p>Welcome back, {displayName || 'Teacher'}!</p>
        </div>
        <div className="header-right">
          <button onClick={handleSignOut} className="sign-out-btn">Sign Out</button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-section primary-actions slide-up">
            <h2>Quick Actions</h2>
            <div className="action-cards">
              <div className="action-card primary bounce-in" onClick={handleCreateQuizClick}>
                <div className="card-icon"><i className="fas fa-plus-circle"></i></div>
                <h3>Create Quiz</h3>
                <p>Design a new assessment for your students.</p>
              </div>
              <div className="action-card secondary bounce-in delay-1" onClick={handleYourQuizzes}>
                <div className="card-icon"><i className="fas fa-list-alt"></i></div>
                <h3>Your Quizzes</h3>
                <p>Manage, grade, and review your quizzes.</p>
              </div>
            </div>
          </div>
          
          <div className="dashboard-section stats-section slide-up delay-6">
            <h2>Quick Stats</h2>
            <div className="stats-cards">
              <div className="stat-card pulse-in">
                <div className="stat-number"><AnimatedCounter value={stats.activeQuizzes} /></div>
                <div className="stat-label">Active Quizzes</div>
              </div>
              <div className="stat-card pulse-in delay-1">
                <div className="stat-number"><AnimatedCounter value={stats.totalQuizzes} /></div>
                <div className="stat-label">Total Quizzes</div>
              </div>
              <div className="stat-card pulse-in delay-2">
                <div className="stat-number"><AnimatedCounter value={stats.totalStudents} /></div>
                <div className="stat-label">Unique Students</div>
              </div>
              <div className="stat-card pulse-in delay-3">
                <div className="stat-number"><AnimatedCounter value={stats.completedSessions} /></div>
                <div className="stat-label">Completed Sessions</div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-section recent-activity slide-up delay-7">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              {recentActivity.map((activity, index) => (
                <div key={index} className="activity-item fade-in-item" style={{animationDelay: `${0.1 * index}s`}}>
                  <div className="activity-icon"><i className={activity.icon}></i></div>
                  <div className="activity-content">
                    <span className="activity-message">{activity.message}</span>
                    <span className="activity-time">{formatDate(activity.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isQuizTypeModalOpen && (
        <div className="quiz-type-modal-overlay" onClick={() => setIsQuizTypeModalOpen(false)}>
          <div className="quiz-type-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h2>Choose Your Quiz Type</h2>
              <p>Select a format to start building your new quiz.</p>
              <button className="close-modal-btn" onClick={() => setIsQuizTypeModalOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="quiz-type-grid">
              <div className="quiz-type-card" onClick={() => handleSelectQuizType('MCQ')}><i className="fas fa-check-double card-type-icon"></i><h3>MCQ Quiz</h3><p>All questions will be Multiple Choice. Ideal for quick knowledge checks.</p></div>
              <div className="quiz-type-card" onClick={() => handleSelectQuizType('FILL_IN_THE_BLANK')}><i className="fas fa-minus card-type-icon"></i><h3>Fill in the Blanks</h3><p>All questions require students to type in a short, specific answer.</p></div>
              <div className="quiz-type-card" onClick={() => handleSelectQuizType('PARAGRAPH')}><i className="fas fa-paragraph card-type-icon"></i><h3>Paragraph Quiz</h3><p>All questions are long-form and require manual grading.</p></div>
              <div className="quiz-type-card" onClick={() => handleSelectQuizType('MIXED')}><i className="fas fa-cubes card-type-icon"></i><h3>Mixed Quiz</h3><p>Combine all question types for a comprehensive assessment.</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherHome;