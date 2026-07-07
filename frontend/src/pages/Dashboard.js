import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PostCard from '../components/PostCard';
import './Dashboard.css';

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    version: '',
    tags: [],
    sortBy: 'date'
  });
  const { user } = useAuth();

  const availableTags = [
    'Dungeon',
    'Stronghold',
    'Mansion',
    'Monument',
    'Pillager Outpost',
    'Mineshaft',
    'Ruined Portal',
    'Igloo',
    'Ravine',
    'Ancient City',
    'Village',
    'Trial Chamber'
  ];

  const availableVersions = ['26.2', '26.1.2', '26.1.1', '26.1', '1.21.11', '1.21.10'];

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.version) params.append('version', filters.version);
      if (filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      params.append('sortBy', filters.sortBy);

      const response = await api.get(`/api/posts?${params.toString()}`);
      setPosts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleTagToggle = (tag) => {
    setFilters(prev => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : prev.tags.length < 4
        ? [...prev.tags, tag]
        : prev.tags;
      return { ...prev, tags: newTags };
    });
  };

  const handleLike = async (postId) => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      await api.post(`/api/posts/${postId}/like`);
      fetchPosts();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <h1>Minecraft Seeds Dashboard</h1>
          <p>các bạn có thể xem Map cụ thể tại <a href="https://www.chunkbase.com/" target="_blank" rel="noopener noreferrer">chunkbase.com</a></p>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label>Version:</label>
            <select
              value={filters.version}
              onChange={(e) => setFilters({ ...filters, version: e.target.value })}
              className="input"
            >
              <option value="">All Versions</option>
              {availableVersions.map(version => (
                <option key={version} value={version}>{version}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Tags (max 4):</label>
            <div className="tags-container">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-button ${filters.tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Sort By:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="input"
            >
              <option value="date">Date (Newest)</option>
              <option value="likes">Most Liked</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="no-posts">No posts found. Be the first to share a seed!</div>
        ) : (
          <div className="posts-grid">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                user={user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
