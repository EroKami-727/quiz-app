import React, { useEffect, useState, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { db, auth } from '../../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../../styles/Student/StudentDashboard.css';
import { PlayCircle, Award, BarChart3 } from 'lucide-react';

const StudentDashboard = () => {
  const user = auth.currentUser;
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState({
    availableQuizzes: [],
    recentQuizzes: [],
    stats: {
      totalQuizzes: 0,
      averageScore: 0,
      bestScore: 0,
      totalTimeSpent: 0
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch active quizzes
      const quizQuery = query(collection(db, 'quizzes'), where('active', '==', true));
      const quizSnapshot = await getDocs(quizQuery);
      const availableQuizzes = quizSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch quiz results for this user
      const resultQuery = query(
        collection(db, 'quiz_results'),
        where('userId', '==', user.uid),
        orderBy('completedAt', 'desc')
      );
      const resultSnapshot = await getDocs(resultQuery);
      const recentQuizzes = resultSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          quizTitle: data.quizTitle || 'Untitled Quiz',
          score: data.score || 0,
          timeSpent: data.timeSpent || 0,
          completedAt: data.completedAt?.toDate() || new Date()
        };
      });

      // Stats calculations
      const scores = recentQuizzes.map(r => r.score);
      const totalQuizzes = scores.length;
      const averageScore = totalQuizzes ? Math.round(scores.reduce((a, b) => a + b, 0) / totalQuizzes) : 0;
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const totalTimeSpent = recentQuizzes.reduce((acc, r) => acc + r.timeSpent, 0);

      setDashboardData({
        availableQuizzes,
        recentQuizzes,
        stats: {
          totalQuizzes,
          averageScore,
          bestScore,
          totalTimeSpent
        }
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/student/login');
  };

  const formatTime = (seconds) => {
    const m = Math.floor((seconds % 3600) / 60);
    const h = Math.floor(seconds / 3600);
    return h ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) {
    return (
      <div className="loading-screen">Loading Dashboard...</div>
    );
  }

  return (
    <div className="student-dashboard-container">
      <button onClick={handleSignOut} className="sign-out-top-btn">Sign Out</button>
      
      {/* Header */}
      <div className="student-dashboard-header fade-in">
        <div className="header-left">
          <h1>📊 Student Dashboard</h1>
          <p className="welcome-text">Welcome, {user?.displayName || user?.email}</p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        <div className="dashboard-grid">
          
          {/* Primary Actions */}
          <div className="dashboard-section primary-actions slide-up">
            <h2>Quick Actions</h2>
            <div className="action-cards">
              <div className="action-card primary subtle-hover" onClick={() => navigate('/student/attend-quiz')}>
                <div className="card-icon">
                  <PlayCircle size={32} />
                </div>
                <h3>Attend Quiz</h3>
                <p>Join available quizzes and test your knowledge</p>
              </div>
              
              <div className="action-card secondary subtle-hover delay-1" onClick={() => navigate('/student/results')}>
                <div className="card-icon">
                  <BarChart3 size={32} />
                </div>
                <h3>Your Results</h3>
                <p>View detailed performance and quiz history</p>
              </div>
            </div>
          </div>

          {/* Progress Summary Card */}
          {dashboardData.stats.totalQuizzes > 0 && (
            <div className="dashboard-section progress-section slide-up delay-2">
              <div className="progress-card">
                <div className="progress-header">
                  <div className="progress-icon">
                    <Award size={32} />
                  </div>
                  <div className="progress-info">
                    <h3>Great Progress!</h3>
                    <p>
                      You've completed <strong>{dashboardData.stats.totalQuizzes}</strong> quiz{dashboardData.stats.totalQuizzes !== 1 ? 'zes' : ''}.
                      {dashboardData.stats.averageScore >= 70 && ' Keep it up!'}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar-section">
                  <label className="progress-label">Average Score</label>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${dashboardData.stats.averageScore}%` }}
                    ></div>
                  </div>
                  <p className="progress-percentage">
                    {dashboardData.stats.averageScore}% average score
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-number">{dashboardData.stats.bestScore}%</span>
                    <span className="stat-label">Best Score</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{dashboardData.stats.totalQuizzes}</span>
                    <span className="stat-label">Total Quizzes</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{formatTime(dashboardData.stats.totalTimeSpent)}</span>
                    <span className="stat-label">Time Spent</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Available Quizzes */}
          <div className="dashboard-section slide-up delay-3">
            <h2>Available Quizzes</h2>
            <div className="available-quizzes-card">
              {dashboardData.availableQuizzes.length > 0 ? (
                <div className="quiz-list">
                  {dashboardData.availableQuizzes.map(quiz => (
                    <div key={quiz.id} className="quiz-list-item fade-in-item">
                      <div className="quiz-info">
                        <h3>{quiz.title}</h3>
                        <p className="quiz-details">
                          {quiz.questions?.length || 0} questions • {formatTime(quiz.timeLimit || 0)}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                        className="join-quiz-btn"
                      >
                        Take Quiz
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No quizzes available at the moment.</p>
                  <p className="empty-subtext">Check back later for new quizzes!</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Results */}
          <div className="dashboard-section slide-up delay-4">
            <h2>Recent Results</h2>
            <div className="recent-results-card">
              {dashboardData.recentQuizzes.length > 0 ? (
                <div className="quiz-list">
                  {dashboardData.recentQuizzes.slice(0, 5).map((result, index) => (
                    <div key={result.id} className="quiz-list-item fade-in-item" style={{animationDelay: `${0.1 * index}s`}}>
                      <div className="quiz-info">
                        <h3>{result.quizTitle}</h3>
                        <p className="quiz-details">
                          Score: <span className={`score ${result.score >= 70 ? 'good-score' : result.score >= 50 ? 'okay-score' : 'poor-score'}`}>
                            {result.score}%
                          </span> • {result.completedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No quiz results yet.</p>
                  <p className="empty-subtext">Take your first quiz to see results here!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;