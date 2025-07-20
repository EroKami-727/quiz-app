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
import MediaTest from './pages/Teacher/MediaTest';
import StudentDashboard from './pages/Student/StudentDashboard.jsx';
import YourResults from './pages/Student/YourResults';
import Grading from './pages/Teacher/Grading'; 

import './App.css';
import { useAuth } from './contexts/AuthContext';

import 'tui-image-editor/dist/tui-image-editor.css';
import 'tui-color-picker/dist/tui-color-picker.css'; // Also needed for color picker

// Simple protected route implementation
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    // A better approach might be to check the intended role
    // but for now this works.
    return <Navigate to="/login" replace />;
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
        
        {/* --- TEACHER ROUTES --- */}
        <Route path="/teacher/home" element={<ProtectedRoute><TeacherHome /></ProtectedRoute>} />
        <Route path="/teacher/create-quiz" element={<ProtectedRoute><CreateQuiz /></ProtectedRoute>} />
        <Route path="/teacher/your-quizzes" element={<ProtectedRoute><YourQuizzes /></ProtectedRoute>} />
        <Route path="/teacher/media-test" element={<ProtectedRoute><MediaTest /></ProtectedRoute>} />
        {/* --- NEW GRADING ROUTE --- */}
        <Route path="/teacher/grading/:quizId" element={<ProtectedRoute><Grading /></ProtectedRoute>} />
        
        {/* --- STUDENT ROUTES --- */}
        <Route path="/student/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/attend-quiz" element={<ProtectedRoute><AttendQuiz /></ProtectedRoute>} />
        <Route path="/student/quiz/:quizId" element={<ProtectedRoute><TakeQuiz /></ProtectedRoute>} />
        <Route path="/student/results" element={<ProtectedRoute><YourResults /></ProtectedRoute>} />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;