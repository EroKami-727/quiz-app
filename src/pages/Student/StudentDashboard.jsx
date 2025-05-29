import React, { useEffect, useState, useCallback } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  PlayCircle, ChevronRight, Award, User, LogOut
} from 'lucide-react';

const StudentDashboard = () => {
  const auth = getAuth();
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
      const quizQuery = query(collection(db, 'quizzes'), where('active', '==', true));
      const quizSnapshot = await getDocs(quizQuery);
      const availableQuizzes = quizSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const resultQuery = query(collection(db, 'quiz_results'), where('uid', '==', user.uid), orderBy('completedAt', 'desc'));
      const resultSnapshot = await getDocs(resultQuery);
      const recentQuizzes = resultSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          quizTitle: data.quizTitle,
          score: data.score,
          timeSpent: data.timeSpent || 0,
          completedAt: data.completedAt?.toDate() || new Date()
        };
      });

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
    <div className="attend-quiz-full-container">
      <button onClick={handleSignOut} className="sign-out-top-btn">Sign Out</button>
      <div className="attend-quiz-content" style={{ width: '80vw' }}>
        <h1>📊 Student Dashboard</h1>
        <p className="welcome-text">Welcome, {user?.displayName || user?.email}</p>

        {/* 🔗 Attend Quiz Button */}
        <div style={{ alignSelf: 'flex-end', marginBottom: '1rem' }}>
          <button
            className="attend-icon-btn"
            onClick={() => navigate('/student/attend-quiz')}
          >
            <PlayCircle size={18} />
            Attend Quiz
          </button>
        </div>

        {/* 📈 Progress Summary Card */}
        {dashboardData.stats.totalQuizzes > 0 && (
          <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg text-white p-8">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <Award className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Great Progress!</h3>
                <p className="text-indigo-100">
                  You've completed <strong>{dashboardData.stats.totalQuizzes}</strong> quiz{dashboardData.stats.totalQuizzes !== 1 ? 'zes' : ''}.
                  {dashboardData.stats.averageScore >= 70 && ' Keep it up!'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <label className="block mb-1 font-semibold">Average Score</label>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-white bg-opacity-90 rounded-full transition-all"
                  style={{ width: `${dashboardData.stats.averageScore}%` }}
                ></div>
              </div>
              <p className="text-right text-sm text-indigo-100 mt-1">
                {dashboardData.stats.averageScore}% average score
              </p>
            </div>

            {/* Other Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-sm text-indigo-100">
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">{dashboardData.stats.bestScore}%</span>
                <span>Best Score</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">{dashboardData.stats.totalQuizzes}</span>
                <span>Total Quizzes</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold">{formatTime(dashboardData.stats.totalTimeSpent)}</span>
                <span>Time Spent</span>
              </div>
            </div>
          </div>
        )}

        {/* 📋 Available Quizzes */}
        <div className="available-quizzes-card">
          <h2>Available Quizzes</h2>
          {dashboardData.availableQuizzes.length > 0 ? (
            <div className="quiz-list">
              {dashboardData.availableQuizzes.map(quiz => (
                <div key={quiz.id} className="quiz-list-item">
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
            <p>No quizzes available.</p>
          )}
        </div>

        {/* 🏆 Recent Results */}
        <div className="available-quizzes-card">
          <h2>Recent Results</h2>
          {dashboardData.recentQuizzes.length > 0 ? (
            <div className="quiz-list">
              {dashboardData.recentQuizzes.slice(0, 5).map(result => (
                <div key={result.id} className="quiz-list-item">
                  <div className="quiz-info">
                    <h3>{result.quizTitle}</h3>
                    <p className="quiz-details">
                      Score: {result.score}% • {result.completedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No quiz results yet. Take a quiz to get started!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;