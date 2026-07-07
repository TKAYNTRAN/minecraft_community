import React from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './PostCard.css';

const PostCard = ({ post, onLike, user, showReport = true, clickable = true, truncateDescription = true }) => {
  const [liked, setLiked] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [showReportModal, setShowReportModal] = React.useState(false);

  const checkIfLiked = React.useCallback(async () => {
    try {
      const response = await api.get(`/api/users/${user.id}/likes/${post.id}`);
      setLiked(response.data.liked);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  }, [user, post.id]);

  React.useEffect(() => {
    if (user) {
      checkIfLiked();
    }
  }, [user, post.id, checkIfLiked]);

  const handleLikeClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) return;
    onLike(post.id);
    setLiked(!liked);
  };

  const handleReport = async (reason) => {
    try {
      await api.post(`/api/posts/${post.id}/report`, 
        { reason }
      );
      setShowReportModal(false);
      alert('Post reported successfully');
    } catch (error) {
      console.error('Error reporting post:', error);
      alert(error.response?.data?.message || 'Failed to report post');
    }
  };

  const handleReportClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowReportModal(true);
  };

  const images = Array.isArray(post.images) ? post.images.filter(img => img !== null) : [];
  const tags = Array.isArray(post.tags) ? post.tags.filter(tag => tag !== null) : [];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text, maxLength = 150) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const cardContent = (
    <div className="post-card">
      {images.length > 0 ? (
        <div className="post-images">
          <img
            src={images[currentImageIndex]}
            alt={`Post ${post.id}`}
            className="post-image"
          />
          {images.length > 1 && (
            <div className="image-navigation">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                }}
                className="nav-button"
              >
                ←
              </button>
              <span>{currentImageIndex + 1} / {images.length}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setCurrentImageIndex((prev) => (prev + 1) % images.length);
                }}
                className="nav-button"
              >
                →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="post-images no-images">
          <span className="no-images-text">No Images</span>
        </div>
      )}

      <div className="post-content">
        <div className="post-header">
          <h3 className="post-seed">{post.name || post.seed}</h3>
          <span className="post-version">{post.version}</span>
        </div>

        {post.description && (
          <p className="post-description">
            {truncateDescription ? truncateText(post.description) : post.description}
          </p>
        )}

        {tags.length > 0 && (
          <div className="post-tags">
            {tags.map((tag, index) => (
              <span key={index} className="post-tag">{tag}</span>
            ))}
          </div>
        )}

        <div className="post-footer">
          <div className="post-meta">
            <span className="post-author">By {post.username}</span>
            <span className="post-date">{formatDate(post.created_at)}</span>
          </div>

          <div className="post-actions">
            {showReport && user && (
              <button
                className="report-button"
                onClick={handleReportClick}
              >
                🚩 Report
              </button>
            )}
            <button
              className={`like-button ${liked ? 'liked' : ''}`}
              onClick={handleLikeClick}
              disabled={!user}
            >
              {liked ? '❤️' : '🤍'} {post.like_count || 0}
            </button>
          </div>
        </div>
      </div>

      {showReportModal && (
        <div className="report-modal">
          <div className="report-modal-content">
            <h3>Report Post</h3>
            <p>Why are you reporting this post?</p>
            <div className="report-reasons">
              <button onClick={() => handleReport('fake information')}>
                Fake information
              </button>
              <button onClick={() => handleReport('invalid description')}>
                Invalid description
              </button>
              <button onClick={() => handleReport('invalid image')}>
                Invalid image
              </button>
            </div>
            <button 
              className="cancel-button"
              onClick={() => setShowReportModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (clickable) {
    return <Link to={`/post/${post.id}`} className="post-card-link">{cardContent}</Link>;
  }

  return cardContent;
};

export default PostCard;
