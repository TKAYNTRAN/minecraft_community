import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreatePost from './pages/CreatePost';
import Favorites from './pages/Favorites';
import MyPosts from './pages/MyPosts';
import AdminDashboard from './pages/AdminDashboard';
import PostDetail from './pages/PostDetail';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Navbar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/create-post" element={<CreatePost />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/my-posts" element={<MyPosts />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/post/:id" element={<PostDetail />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
