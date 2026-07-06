import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchReportCount();
    }
  }, [user]);

  const fetchReportCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/posts/reports/count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportCount(response.data.count);
    } catch (error) {
      console.error('Error fetching report count:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="navbar-brand">
          🌱 Minecraft Seed Manager
        </Link>
        <div className="navbar-links">
          <button onClick={toggleTheme} className="theme-toggle">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <Link to="/" className="nav-link">Dashboard</Link>
          {user ? (
            <>
              <Link to="/create-post" className="nav-link">Create Post</Link>
              <Link to="/my-posts" className="nav-link">My Posts</Link>
              <Link to="/favorites" className="nav-link">Favorites</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="nav-link admin-link">
                  Admin
                  {reportCount > 0 && (
                    <span className="report-badge">{reportCount}</span>
                  )}
                </Link>
              )}
              <span className="nav-user">Welcome, {user.username}</span>
              <button onClick={logout} className="btn btn-secondary">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
