import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginChoice from './pages/LoginChoice';
import StudentLogin from './pages/Student/Studentlogin';
import TeacherLogin from './pages/Teacher/Teacherlogin';
import AttendQuiz from './pages/Student/AttendQuiz';
import TakeQuiz from './pages/Student/TakeQuiz';
import CreateQuiz from './pages/Teacher/CreateQuiz';
import TeacherHome from './pages/Teacher/TeacherHome';
import YourQuizzes from './pages/Teacher/YourQuizzes';
import StudentDashboard from './pages/Student/StudentDashboard.jsx';
import YourResults from './pages/Student/YourResults';

import './App.css';
import { getAuth } from 'firebase/auth';
import { useAuth } from './contexts/AuthContext';

// Simple protected route implementation
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/student/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <div className="main-container">
      <Routes>
        {/* Redirect root to login choice */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Public routes */}
        <Route path="/login" element={<LoginChoice />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        
        {/* Protected routes */}
        <Route 
          path="/student/dashboard" 
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/attend-quiz" 
          element={
            <ProtectedRoute>
              <AttendQuiz />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/quiz/:quizId" 
          element={
            <ProtectedRoute>
              <TakeQuiz />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/teacher/create-quiz" 
          element={
            <ProtectedRoute>
              <CreateQuiz />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/teacher/home" 
          element={
            <ProtectedRoute>
              <TeacherHome />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/teacher/your-quizzes" 
          element={
            <ProtectedRoute>
              <YourQuizzes />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/student/results" 
          element={
            <ProtectedRoute>
              <YourResults />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;