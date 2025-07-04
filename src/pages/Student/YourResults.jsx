import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import '../../styles/Student/YourResults.css';
import { FaArrowLeft, FaEye } from 'react-icons/fa';

const YourResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchResults = async () => {
      if (!currentUser) { setError('User not authenticated'); setLoading(false); return; }
      try {
        setLoading(true); setError('');
        const resultsRef = collection(db, 'quiz_results');
        const q = query(resultsRef, where('userId', '==', currentUser.uid), orderBy('completedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedResults = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const percentage = data.maxScore > 0 ? Math.round((data.finalScore / data.maxScore) * 100) : 0;
            return { id: doc.id, ...data, percentage };
        });
        setResults(fetchedResults);
      } catch (err) { console.error('Error fetching quiz results:', err); setError(`Failed to load quiz results.`); } 
      finally { setLoading(false); }
    };
    fetchResults();
  }, [currentUser]);

  const getScoreClass = (percentage) => {
    if (percentage >= 80) return 'excellent'; if (percentage >= 60) return 'good'; if (percentage >= 40) return 'okay'; return 'poor';
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) return <div className="student-results-loading-screen"><div className="student-results-loading-spinner"></div><p>Loading your results...</p></div>;

  return (
    <div className="student-results-container">
      <div className="student-results-content">
        <div className="student-results-page-header">
          <button className="student-results-back-btn" onClick={() => navigate('/student/dashboard')}><FaArrowLeft /> Dashboard</button>
          <h1>Your Results</h1>
          <div className="student-results-count">{results.length} Quiz{results.length !== 1 ? 'zes' : ''} Taken</div>
        </div>
        {error && <div className="student-results-error-message">{error}</div>}
        {results.length === 0 && !loading ? (
          <div className="student-results-no-results">
             <h3>No Results Yet</h3>
             <p>Complete a quiz to see your results here.</p>
             <button className="student-results-take-first-quiz-btn" onClick={() => navigate('/student/attend-quiz')}>Take a Quiz</button>
          </div>
        ) : (
          <div className="student-results-grid">
            {results.map((result) => (
              <div key={result.id} className="student-result-card">
                <div className="student-result-card-header">
                  <h3 className="student-quiz-title">{result.quizTitle}</h3>
                  <div className={`student-score-badge ${getScoreClass(result.percentage)}`}>{result.percentage}%</div>
                </div>
                <div className="student-result-card-body">
                  <div className="student-result-meta">
                    <div><strong>Score:</strong> {result.finalScore} / {result.maxScore}</div>
                    <div><strong>Bonus:</strong> +{result.bonus}</div>
                    <div><strong>Completed:</strong> {formatDate(result.completedAt)}</div>
                  </div>
                </div>
                <div className="student-result-card-actions">
                  <button className="student-review-btn" onClick={() => navigate(`/student/results/${result.id}`)}><FaEye /> View Review</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default YourResults;