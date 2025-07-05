import React, { useEffect, useState, useCallback } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Award, BarChart2, BookOpen, Clock, Star, TrendingUp } from 'lucide-react';
import '../../styles/Student/StudentDashboard.css';

const StudentDashboard = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState({
    recentResults: [],
    stats: {
      quizzesTaken: 0,
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
      const resultQuery = query(
        collection(db, 'quiz_results'), 
        where('userId', '==', user.uid), 
        orderBy('completedAt', 'desc')
      );
      const resultSnapshot = await getDocs(resultQuery);
      
      const results = resultSnapshot.docs.map(doc => doc.data());

      const quizzesTaken = results.length;
      let totalPercentage = 0;
      let bestScore = 0;
      let totalTimeSpent = 0;

      results.forEach(r => {
        const percentage = r.maxScore > 0 ? (r.finalScore / r.maxScore) * 100 : 0;
        totalPercentage += percentage;
        if (percentage > bestScore) {
          bestScore = percentage;
        }
        totalTimeSpent += r.timeSpent || 0;
      });

      const averageScore = quizzesTaken > 0 ? Math.round(totalPercentage / quizzesTaken) : 0;
      
      setDashboardData({
        recentResults: results.slice(0, 3), // Show the 3 most recent results
        stats: {
          quizzesTaken,
          averageScore,
          bestScore: Math.round(bestScore),
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
    try {
        await signOut(auth);
        navigate('/student/login');
    } catch (error) {
        console.error("Sign out error", error);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="student-loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="student-dashboard-container">
        <div className="student-dashboard-header student-fade-in">
            <div className="student-header-left">
                <h1>Dashboard</h1>
                <p className="student-welcome-text">Welcome back, {user?.displayName || user?.email}!</p>
            </div>
            <button onClick={handleSignOut} className="student-sign-out-top-btn">Sign Out</button>
        </div>
        
        <div className="student-dashboard-grid">
            <div className="student-dashboard-main">
                <div className="student-dashboard-section student-slide-up">
                    <h2>Get Started</h2>
                    <div className="student-action-cards">
                        <div className="student-action-card primary" onClick={() => navigate('/student/attend-quiz')}>
                            <div className="student-card-icon"><PlayCircle size={32} /></div>
                            <h3>Attend a Quiz</h3>
                            <p>Enter a quiz code to start a new assessment.</p>
                        </div>
                        <div className="student-action-card secondary" onClick={() => navigate('/student/results')}>
                            <div className="student-card-icon"><BookOpen size={32} /></div>
                            <h3>Your Results</h3>
                            <p>Review your past performance and scores.</p>
                        </div>
                        <div className="student-action-card tertiary" onClick={() => alert('Analytics feature coming soon!')}>
                            <div className="student-card-icon"><BarChart2 size={32} /></div>
                            <h3>Your Analytics</h3>
                            <p>Track your progress and insights over time.</p>
                        </div>
                    </div>
                </div>

                <div className="student-dashboard-section student-slide-up student-delay-2">
                    <h2>Recent Activity</h2>
                    <div className="student-quiz-list">
                        {dashboardData.recentResults.length > 0 ? (
                            dashboardData.recentResults.map(result => (
                                <div key={result.completedAt.seconds} className="student-quiz-list-item">
                                    <div className="student-quiz-info">
                                        <h3>{result.quizTitle}</h3>
                                        <p className="student-quiz-details">Completed on {formatDate(result.completedAt)}</p>
                                    </div>
                                    <div className={`student-score ${result.finalScore / result.maxScore >= 0.7 ? 'good' : 'poor'}`}>
                                        {Math.round((result.finalScore / result.maxScore) * 100)}%
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="student-empty-state">
                                <p>You haven't completed any quizzes yet.</p>
                                <span className="student-empty-subtext">Click "Attend a Quiz" to get started!</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <aside className="student-dashboard-sidebar student-slide-up student-delay-1">
                <div className="student-dashboard-section">
                    <h2>Progress Summary</h2>
                    <div className="student-progress-card">
                        <div className="student-progress-header">
                            <div className="student-progress-icon"><TrendingUp size={24}/></div>
                            <div className="student-progress-info">
                                <h3>Overall Performance</h3>
                            </div>
                        </div>
                        <div className="student-progress-bar-section">
                            <label className="student-progress-label">Average Score</label>
                            <div className="student-progress-bar-container">
                                <div className="student-progress-bar-fill" style={{ width: `${dashboardData.stats.averageScore}%` }}></div>
                            </div>
                            <p className="student-progress-percentage">{dashboardData.stats.averageScore}%</p>
                        </div>
                        <div className="student-stats-grid">
                            <div className="student-stat-item">
                                <span className="student-stat-number">{dashboardData.stats.quizzesTaken}</span>
                                <span className="student-stat-label">Quizzes Taken</span>
                            </div>
                            <div className="student-stat-item">
                                <span className="student-stat-number">{dashboardData.stats.bestScore}%</span>
                                <span className="student-stat-label">Best Score</span>
                            </div>
                            <div className="student-stat-item">
                                <span className="student-stat-number">{formatTime(dashboardData.stats.totalTimeSpent)}</span>
                                <span className="student-stat-label">Total Time</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </div>
  );
};

export default StudentDashboard;