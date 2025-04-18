import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Homepage from './pages/Homepage';
import LoginChoice from './pages/LoginChoice';
import StudentLogin from './pages/Student/Studentlogin';
import TeacherLogin from './pages/Teacher/Teacherlogin';
import AttendQuiz from './pages/Student/AttendQuiz';
import CreateQuiz from './pages/Teacher/CreateQuiz';
import './App.css';

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
        
        {/* Protected routes wrapped in Layout */}
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Homepage />} />
          <Route path="student/attend-quiz/:quizId" element={<AttendQuiz />} />
          <Route path="teacher/create-quiz" element={<CreateQuiz />} />
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;