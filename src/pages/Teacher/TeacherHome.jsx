import React, { useState, useEffect, useRef } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/Teacher/TeacherHome.css';

const TeacherHome = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const { currentUser, displayName, userRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dataFetched = useRef(false);

  const [stats, setStats] = useState({
    activeQuizzes: 0,
    totalQuizzes: 0,
    totalStudents: 0,
    completedSessions: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

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

  useEffect(() => {
    if (currentUser && !dataFetched.current) {
      dataFetched.current = true;
      fetchDashboardData();
    }
  }, [currentUser]);

  const fetchDashboardData = async () => {
    setStatsLoading(true);
    try {
      const quizzesQuery = query(
        collection(db, "quizzes"),
        where("createdBy", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const quizzesSnapshot = await getDocs(quizzesQuery);
      const quizzes = [];
      let activeCount = 0;

      quizzesSnapshot.forEach((doc) => {
        const quizData = { id: doc.id, ...doc.data() };
        quizzes.push(quizData);
        if (quizData.active) activeCount++;
      });

      let completedSessionsCount = 0;
      let uniqueStudents = new Set();

      try {
        const sessionsQuery = query(
          collection(db, "sessions"),
          where("teacherId", "==", currentUser.uid),
          orderBy("completedAt", "desc"),
          limit(100)
        );

        const sessionsSnapshot = await getDocs(sessionsQuery);
        sessionsSnapshot.forEach((doc) => {
          const sessionData = doc.data();
          if (sessionData.completed) completedSessionsCount++;
          if (sessionData.studentId) uniqueStudents.add(sessionData.studentId);
        });
      } catch {
        console.log("Sessions data not available yet");
      }

      setStats({
        activeQuizzes: activeCount,
        totalQuizzes: quizzes.length,
        totalStudents: uniqueStudents.size,
        completedSessions: completedSessionsCount
      });

      const activity = quizzes.slice(0, 3).map(quiz => ({
        type: 'quiz_created',
        message: `Created quiz "${quiz.title}"`,
        timestamp: quiz.createdAt,
        icon: 'fas fa-plus-circle'
      }));

      setRecentActivity(activity.length > 0 ? activity : [
        {
          type: 'welcome',
          message: 'Welcome to your teacher dashboard!',
          timestamp: new Date(),
          icon: 'fas fa-star'
        }
      ]);

    } catch (error) {
      console.error("Error fetching dashboard data: ", error);
      setError('Error loading dashboard data');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth).then(() => {
      navigate('/teacher/login');
    }).catch((error) => {
      setError('Failed to sign out: ' + error.message);
    });
  };

  const handleCreateQuiz = () => navigate('/teacher/create-quiz');
  const handleYourQuizzes = () => navigate('/teacher/your-quizzes');
  const handleProfile = () => navigate('/teacher/profile');
  const handleAnalytics = () => navigate('/teacher/analytics');
  const handleStudentResults = () => navigate('/teacher/student-results');
  const handleQuizHistory = () => navigate('/teacher/quiz-history');

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);

      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const AnimatedCounter = ({ value, duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const [hasAnimated, setHasAnimated] = useState(false);
    const countRef = useRef(0);
    const requestRef = useRef();
    const startTimeRef = useRef();
    const initialValueRef = useRef(null);

    useEffect(() => {
      if (initialValueRef.current === null) initialValueRef.current = value;
      if (value === 0) {
        setCount(0); setHasAnimated(true); return;
      }
      if (hasAnimated && value === initialValueRef.current) return;
      if (value !== initialValueRef.current) {
        setHasAnimated(false);
        initialValueRef.current = value;
      }

      const animate = (timestamp) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentCount = Math.floor(easeOutQuart * value);
        setCount(currentCount);
        countRef.current = currentCount;

        if (progress < 1) {
          requestRef.current = requestAnimationFrame(animate);
        } else {
          setCount(value);
          setHasAnimated(true);
          startTimeRef.current = null;
        }
      };

      if (!hasAnimated) requestRef.current = requestAnimationFrame(animate);
      return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
    }, [value, duration, hasAnimated]);

    return <span>{count.toLocaleString()}</span>;
  };

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="teacher-home-container">
      <div className="teacher-home-header fade-in">
        <div className="header-left">
          <h1>Teacher Dashboard</h1>
          <p>Welcome back, {displayName || 'Teacher'}!</p>
        </div>
        <div className="header-right">
          <button onClick={handleProfile} className="profile-btn"><i className="fas fa-user"></i> Profile</button>
          <button onClick={handleSignOut} className="sign-out-btn">Sign Out</button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-content">
        <div className="dashboard-grid">
          
          {/* Primary Actions */}
          <div className="dashboard-section primary-actions slide-up">
            <h2>Quick Actions</h2>
            <div className="action-cards">

              <div className="action-card primary bounce-in" onClick={handleCreateQuiz}>
                <div className="card-icon">
                  <i className="fas fa-list-ul"></i>
                </div>
                <h3>Create Multiple Choice Questions</h3>
                <p>Create MCQs</p>
              </div>

              <div className="action-card primary bounce-in delay-1" onClick={() => navigate('/teacher/schedule')}>
                <div className="card-icon">
                  <i className="fas fa-align-left"></i>
                </div>
                <h3>Paragraphs</h3>
                <p>Create paragraph based question</p>
              </div>

              <div className="action-card primary bounce-in delay-2" onClick={() => navigate('/teacher/questions-bank')}>
                <div className="card-icon">
                  <i className="fas fa-pen"></i>
                </div>
                <h3>Fill Them!</h3>
                <p>Create fill in the blanks questions</p>
              </div>

              <div className="action-card primary bounce-in delay-3" onClick={() => navigate('/teacher/send-reminders')}>
                <div className="card-icon">
                  <i className="fas fa-video"></i>
                </div>
                <h3>Video Based Learning</h3>
                <p>Create questions based on the video</p>
              </div>

              <div className="action-card secondary bounce-in delay-4" onClick={handleYourQuizzes}>
                <div className="card-icon">
                  <i className="fas fa-list-alt"></i>
                </div>
                <h3>Your Quizzes</h3>
                <p>Manage and edit your existing quizzes</p>
              </div>

            </div>
          </div>

          {/* Management Tools */}
          <div className="dashboard-section management-tools slide-up delay-2">
            <h2>Management</h2>
            <div className="action-cards">
              <div className="action-card bounce-in delay-3" onClick={handleStudentResults}>
                <div className="card-icon"><i className="fas fa-chart-bar"></i></div>
                <h3>Student Results</h3>
                <p>View detailed student performance</p>
              </div>
              <div className="action-card bounce-in delay-4" onClick={handleAnalytics}>
                <div className="card-icon"><i className="fas fa-chart-line"></i></div>
                <h3>Analytics</h3>
                <p>Track quiz performance and insights</p>
              </div>
              <div className="action-card bounce-in delay-5" onClick={handleQuizHistory}>
                <div className="card-icon"><i className="fas fa-history"></i></div>
                <h3>Quiz History</h3>
                <p>Browse past quiz sessions</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="dashboard-section stats-section slide-up delay-6">
            <h2>Quick Stats</h2>
            <div className="stats-cards">
              <div className="stat-card pulse-in">
                <div className="stat-number">
                  {statsLoading ? <div className="loading-spinner"></div> : <AnimatedCounter value={stats.activeQuizzes} />}
                </div>
                <div className="stat-label">Active Quizzes</div>
              </div>
              <div className="stat-card pulse-in delay-1">
                <div className="stat-number">
                  {statsLoading ? <div className="loading-spinner"></div> : <AnimatedCounter value={stats.totalQuizzes} />}
                </div>
                <div className="stat-label">Total Quizzes</div>
              </div>
              <div className="stat-card pulse-in delay-2">
                <div className="stat-number">
                  {statsLoading ? <div className="loading-spinner"></div> : <AnimatedCounter value={stats.totalStudents} />}
                </div>
                <div className="stat-label">Unique Students</div>
              </div>
              <div className="stat-card pulse-in delay-3">
                <div className="stat-number">
                  {statsLoading ? <div className="loading-spinner"></div> : <AnimatedCounter value={stats.completedSessions} />}
                </div>
                <div className="stat-label">Completed Sessions</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="dashboard-section recent-activity slide-up delay-7">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              {recentActivity.map((activity, index) => (
                <div key={index} className="activity-item fade-in-item" style={{ animationDelay: `${0.1 * index}s` }}>
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
    </div>
  );
};

export default TeacherHome;
