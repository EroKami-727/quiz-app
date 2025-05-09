import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginChoice from './pages/LoginChoice';
import StudentLogin from './pages/Student/Studentlogin';
import TeacherLogin from './pages/Teacher/Teacherlogin';
import AttendQuiz from './pages/Student/AttendQuiz';
import './App.css';
import { getAuth } from 'firebase/auth';

// Simple protected route implementation
const ProtectedRoute = ({ children }) => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
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
        
        {/* Protected route */}
        <Route 
          path="/student/attend-quiz" 
          element={
            <ProtectedRoute>
              <AttendQuiz />
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