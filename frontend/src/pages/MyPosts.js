import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import PostCard from '../components/PostCard';
import './MyPosts.css';

const MyPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchMyPosts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await api.get(`/api/posts/user/${user.id}`);
      setPosts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching my posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchMyPosts();
  }, [user, navigate, fetchMyPosts]);

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await api.delete(`/api/posts/${postId}`);
      fetchMyPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const handleVisibilityToggle = async (postId, currentVisibility) => {
    const newVisibility = currentVisibility === 'public' ? 'private' : 'public';
    
    try {
      const token = localStorage.getItem('token');
      await api.patch(`/api/posts/${postId}/visibility`, 
        { visibility: newVisibility }
      );
      fetchMyPosts();
    } catch (error) {
      console.error('Error updating visibility:', error);
      alert('Failed to update visibility');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="my-posts-page">
      <div className="container">
        <div className="my-posts-header">
          <h1>My Posts</h1>
          <p>Manage your seed posts</p>
        </div>

        {loading ? (
          <div className="loading">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="no-posts">
            <p>You haven't created any posts yet.</p>
            <button onClick={() => navigate('/create-post')} className="btn btn-primary">
              Create Your First Post
            </button>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map(post => (
              <div key={post.id} className="my-post-card">
                <PostCard post={post} user={user} onLike={() => {}} clickable={false} showReport={false} />
                <div className="post-actions">
                  <button
                    onClick={() => handleVisibilityToggle(post.id, post.visibility)}
                    className={`visibility-btn ${post.visibility}`}
                  >
                    {post.visibility === 'public' ? '👁️ Public' : '🔒 Private'}
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="delete-btn"
                  >
                    🗑️ Delete
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

export default MyPosts;
