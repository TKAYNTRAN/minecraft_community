import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchReports();
  }, [user, navigate]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/posts/reports/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/posts/reports/${reportId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports();
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Failed to resolve report');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-dashboard-page">
      <div className="container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>Manage reported posts</p>
        </div>

        {loading ? (
          <div className="loading">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="no-reports">
            <p>No pending reports.</p>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map(report => (
              <div key={report.id} className="report-card">
                <div className="report-info">
                  <div className="report-header">
                    <h3>Report #{report.id}</h3>
                    <span className={`report-status ${report.status}`}>
                      {report.status}
                    </span>
                  </div>
                  <div className="report-details">
                    <p>
                      <strong>Post:</strong> 
                      <Link to={`/post/${report.post_id}`} className="post-link">
                        {report.name || report.seed}
                      </Link> 
                      (Version {report.version})
                    </p>
                    <p><strong>Reported by:</strong> {report.reporter_username}</p>
                    <p><strong>Post author:</strong> {report.post_author_username}</p>
                    <p><strong>Reason:</strong> {report.reason}</p>
                    <p><strong>Reported at:</strong> {formatDate(report.created_at)}</p>
                  </div>
                </div>
                <div className="report-actions">
                  <button
                    onClick={() => handleDeletePost(report.post_id)}
                    className="delete-post-btn"
                  >
                    🗑️ Delete Post
                  </button>
                  <button
                    onClick={() => handleResolveReport(report.id)}
                    className="resolve-btn"
                  >
                    ✓ Mark as Resolved
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
