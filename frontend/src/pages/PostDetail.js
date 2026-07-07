import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './PostDetail.css';

const PostDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchPost = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/posts/${id}`);
      setPost(response.data);
    } catch (error) {
      console.error('Error fetching post:', error);
      setError('Post not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleLike = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      await api.post(`/api/posts/${id}/like`);
      fetchPost();
    } catch (error) {
      console.error('Error liking post:', error);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await api.delete(`/api/posts/${id}`);
      navigate('/');
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const handleVisibilityToggle = async () => {
    const newVisibility = post.visibility === 'public' ? 'private' : 'public';
    
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/api/posts/${id}/visibility`, 
        { visibility: newVisibility }
      );
      fetchPost();
    } catch (error) {
      console.error('Error updating visibility:', error);
      alert('Failed to update visibility');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="post-detail-page">
        <div className="container">
          <div className="loading">Loading post...</div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="post-detail-page">
        <div className="container">
          <div className="error-message">
            <p>{error || 'Post not found'}</p>
            <Link to="/" className="btn btn-primary">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const images = Array.isArray(post.images) ? post.images.filter(img => img !== null) : [];
  const tags = Array.isArray(post.tags) ? post.tags.filter(tag => tag !== null) : [];
  const isOwner = user && user.id === post.user_id;
  const isAdmin = user && user.role === 'admin';

  return (
    <div className="post-detail-page">
      <div className="container">
        <div className="back-button">
          <Link to="/" className="btn btn-secondary">← Back to Dashboard</Link>
        </div>

        <div className="post-detail-content">
          <div className="post-detail-images">
            {images.length > 0 ? (
              <div className="image-gallery">
                {images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Post ${index + 1}`}
                    className="detail-image"
                  />
                ))}
              </div>
            ) : (
              <div className="no-images">No images available</div>
            )}
          </div>

          <div className="post-detail-info">
            <div className="post-detail-header">
              <h1 className="post-seed">{post.name || post.seed}</h1>
              <span className={`post-version ${post.visibility}`}>
                {post.version} ({post.visibility})
              </span>
            </div>

            <div className="post-detail-meta">
              <p className="post-seed-code">
                <strong>Seed Code:</strong> {post.seed}
              </p>
              <p className="post-author">
                Posted by <strong>{post.username}</strong>
              </p>
              <p className="post-date">{formatDate(post.created_at)}</p>
              <p className="post-likes">{post.like_count || 0} likes</p>
            </div>

            {tags.length > 0 && (
              <div className="post-detail-tags">
                {tags.map((tag, index) => (
                  <span key={index} className="post-tag">{tag}</span>
                ))}
              </div>
            )}

            {post.description && (
              <div className="post-detail-description">
                <h3>Description</h3>
                <p>{post.description}</p>
              </div>
            )}

            <div className="post-detail-actions">
              <button
                onClick={handleLike}
                className="btn btn-primary"
                disabled={!user}
              >
                ❤️ Like Post
              </button>

              {isOwner && (
                <>
                  <button
                    onClick={handleVisibilityToggle}
                    className={`btn ${post.visibility === 'public' ? 'btn-warning' : 'btn-success'}`}
                  >
                    {post.visibility === 'public' ? '🔒 Make Private' : '👁️ Make Public'}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn btn-danger"
                  >
                    🗑️ Delete Post
                  </button>
                </>
              )}

              {isAdmin && !isOwner && (
                <button
                  onClick={handleDelete}
                  className="btn btn-danger"
                >
                  🗑️ Delete Post (Admin)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
