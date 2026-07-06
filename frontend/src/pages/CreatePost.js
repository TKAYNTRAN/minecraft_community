import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './CreatePost.css';

const CreatePost = () => {
  const [formData, setFormData] = useState({
    version: '',
    seed: '',
    name: '',
    description: '',
    tags: []
  });
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }
    
    setImages(selectedFiles);
    setError('');
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : prev.tags.length < 4
        ? [...prev.tags, tag]
        : prev.tags;
      
      if (newTags.length === 4 && !prev.tags.includes(tag)) {
        setError('Maximum 4 tags allowed');
      } else {
        setError('');
      }
      
      return { ...prev, tags: newTags };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in to create a post');
      return;
    }

    if (!formData.version || !formData.seed) {
      setError('Version and seed are required');
      return;
    }

    try {
      const data = new FormData();
      data.append('version', formData.version);
      data.append('seed', formData.seed);
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('tags', JSON.stringify(formData.tags));
      
      images.forEach(image => {
        data.append('images', image);
      });

      const token = localStorage.getItem('token');
      await axios.post('/api/posts', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    }
  };

  if (!user) {
    return (
      <div className="create-post-page">
        <div className="container">
          <div className="auth-warning">
            <h2>Please Login</h2>
            <p>You must be logged in to create a post.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-post-page">
      <div className="container">
        <div className="create-post-card">
          <h1>Create New Seed Post</h1>
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Version *</label>
              <select
                name="version"
                value={formData.version}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select Version</option>
                {availableVersions.map(version => (
                  <option key={version} value={version}>{version}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Seed Code *</label>
              <input
                type="text"
                name="seed"
                value={formData.seed}
                onChange={handleChange}
                className="input"
                placeholder="Enter seed code"
                required
              />
            </div>

            <div className="form-group">
              <label>Post Name (Optional)</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="Enter a name for your post"
              />
            </div>

            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input textarea"
                placeholder="Describe your seed..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Images (Optional - Max 5)</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="input file-input"
              />
              {images.length > 0 && (
                <div className="image-preview">
                  <p>Selected: {images.length} image(s)</p>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Tags (Optional - Max 4)</label>
              <div className="tags-container">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-button ${formData.tags.includes(tag) ? 'active' : ''}`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary">Create Post</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
