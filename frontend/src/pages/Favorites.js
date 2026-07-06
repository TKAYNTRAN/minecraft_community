import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PostCard from '../components/PostCard';
import './Favorites.css';

const Favorites = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/users/${user.id}/likes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFavorites();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="favorites-page">
      <div className="container">
        <div className="favorites-header">
          <h1>My Favorites</h1>
          <p>Seeds you've liked</p>
        </div>

        {loading ? (
          <div className="loading">Loading favorites...</div>
        ) : posts.length === 0 ? (
          <div className="no-favorites">
            <p>You haven't liked any posts yet.</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">
              Explore Seeds
            </button>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                user={user}
                clickable={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
